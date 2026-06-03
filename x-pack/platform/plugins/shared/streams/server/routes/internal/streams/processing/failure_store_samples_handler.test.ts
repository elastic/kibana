/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { FlattenRecord } from '@kbn/streams-schema';
import type { Streams } from '@kbn/streams-schema';
import type { StreamlangDSL } from '@kbn/streamlang';
import type { StreamsClient } from '../../../../lib/streams/client';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import { collectAncestorProcessing, getFailureStoreSamples } from './failure_store_samples_handler';
import { simulateProcessing } from './simulation_handler';
import type { ProcessingSimulationResponse } from '@kbn/streams-schema';

jest.mock('./simulation_handler', () => ({
  simulateProcessing: jest.fn(),
}));

const mockSimulateProcessing = simulateProcessing as jest.MockedFunction<typeof simulateProcessing>;

const makeGrokStep = (field: string): StreamlangDSL['steps'][number] => ({
  action: 'grok' as const,
  from: field,
  patterns: ['%{GREEDYDATA:parsed}'],
});

const makeAncestor = (
  name: string,
  steps: StreamlangDSL['steps'] = []
): Streams.WiredStream.Definition =>
  ({
    name,
    type: 'wired',
    ingest: {
      processing: { steps, updated_at: '2024-01-01T00:00:00.000Z' },
      wired: { fields: {}, routing: [] },
      lifecycle: { inherit: true },
      settings: {},
      failure_store: { enabled: false },
    },
  } as unknown as Streams.WiredStream.Definition);

const makeEsSearchResponse = (sources: FlattenRecord[]) => ({
  hits: {
    hits: sources.map((source) => ({
      _source: {
        '@timestamp': '2024-01-01T00:00:00.000Z',
        document: { source },
        error: { message: 'parse error' },
      },
    })),
  },
});

const makeSimulationResponse = (docs: FlattenRecord[]): ProcessingSimulationResponse => ({
  detected_fields: [],
  documents: docs.map((value) => ({
    value,
    detected_fields: [],
    errors: [],
    status: 'parsed' as const,
    processed_by: [],
  })),
  processors_metrics: {},
  definition_error: undefined,
  documents_metrics: {
    failed_rate: 0,
    partially_parsed_rate: 0,
    skipped_rate: 0,
    parsed_rate: 1,
    dropped_rate: 0,
  },
});

const makeDeps = ({
  searchResponse,
  ancestors = [],
}: {
  searchResponse: ReturnType<typeof makeEsSearchResponse>;
  ancestors?: Streams.WiredStream.Definition[];
}) => ({
  esClient: {
    search: jest.fn().mockResolvedValue(searchResponse),
  } as unknown as ElasticsearchClient,
  streamsClient: {
    getAncestors: jest.fn().mockResolvedValue(ancestors),
  } as unknown as StreamsClient,
  fieldsMetadataClient: {} as IFieldsMetadataClient,
});

describe('collectAncestorProcessing', () => {
  it('returns empty steps when there are no ancestors', () => {
    const result = collectAncestorProcessing([]);
    expect(result.steps).toEqual([]);
  });

  it('returns steps from a single ancestor', () => {
    const step = makeGrokStep('message');
    const ancestor = makeAncestor('logs', [step]);

    const result = collectAncestorProcessing([ancestor]);

    expect(result.steps).toEqual([step]);
  });

  it('returns steps from multiple ancestors in root-to-parent order', () => {
    const rootStep = makeGrokStep('root_field');
    const parentStep = makeGrokStep('parent_field');

    // Provide them out of order (parent before root) to verify sorting
    const parent = makeAncestor('logs.nginx', [parentStep]);
    const root = makeAncestor('logs', [rootStep]);

    const result = collectAncestorProcessing([parent, root]);

    expect(result.steps).toEqual([rootStep, parentStep]);
  });

  it('skips ancestors that have no processing steps', () => {
    const step = makeGrokStep('message');
    const withSteps = makeAncestor('logs', [step]);
    const withoutSteps = makeAncestor('logs.nginx', []);

    const result = collectAncestorProcessing([withoutSteps, withSteps]);

    expect(result.steps).toEqual([step]);
  });

  it('does not include the current stream — regression test for the double-processing bug', () => {
    // Simulate the bug scenario: ancestor has steps, and so does the current stream.
    // collectAncestorProcessing should only ever receive ancestors (not the current stream),
    // and this test verifies that the contract of the function is correctly scoped.
    const ancestorStep = makeGrokStep('ancestor_field');
    const ancestor = makeAncestor('logs', [ancestorStep]);

    // The current stream's step — this must NOT appear in the output
    const currentStreamStep = makeGrokStep('current_field');
    const currentStream = makeAncestor('logs.nginx', [currentStreamStep]);

    // Only pass the ancestor, not the current stream
    const result = collectAncestorProcessing([ancestor]);

    expect(result.steps).toContainEqual(ancestorStep);
    expect(result.steps).not.toContainEqual(currentStreamStep);
    // Also verify: if someone incorrectly passes the current stream, its step would appear
    const buggyResult = collectAncestorProcessing([ancestor, currentStream]);
    expect(buggyResult.steps).toContainEqual(currentStreamStep);
  });
});

describe('getFailureStoreSamples', () => {
  const baseDoc: FlattenRecord = { message: 'failed log line', 'log.level': 'error' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('direct child of root optimization', () => {
    it('returns raw failure store docs without fetching ancestors for logs.child', async () => {
      const { esClient, streamsClient, fieldsMetadataClient } = makeDeps({
        searchResponse: makeEsSearchResponse([baseDoc]),
      });

      const result = await getFailureStoreSamples({
        params: { path: { name: 'logs.nginx' } },
        esClient,
        streamsClient,
        fieldsMetadataClient,
      });

      expect(result.documents).toEqual([baseDoc]);
      expect(streamsClient.getAncestors).not.toHaveBeenCalled();
      expect(mockSimulateProcessing).not.toHaveBeenCalled();
    });

    it('queries the failure store index using the ::failures selector', async () => {
      const { esClient, streamsClient, fieldsMetadataClient } = makeDeps({
        searchResponse: makeEsSearchResponse([baseDoc]),
      });

      await getFailureStoreSamples({
        params: { path: { name: 'logs.nginx' } },
        esClient,
        streamsClient,
        fieldsMetadataClient,
      });

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({ index: 'logs.nginx::failures' })
      );
    });
  });

  describe('empty failure store', () => {
    it('returns empty array without fetching ancestors', async () => {
      const { esClient, streamsClient, fieldsMetadataClient } = makeDeps({
        searchResponse: makeEsSearchResponse([]),
      });

      const result = await getFailureStoreSamples({
        params: { path: { name: 'logs.nginx.access' } },
        esClient,
        streamsClient,
        fieldsMetadataClient,
      });

      expect(result.documents).toEqual([]);
      expect(streamsClient.getAncestors).not.toHaveBeenCalled();
    });

    it('returns empty array when failure store index does not exist (404)', async () => {
      const notFoundError = new errors.ResponseError({
        statusCode: 404,
        headers: {},
        meta: {} as never,
        body: { error: { type: 'index_not_found_exception' } },
        warnings: null,
      });

      const { esClient, streamsClient, fieldsMetadataClient } = makeDeps({
        searchResponse: makeEsSearchResponse([]),
      });
      (esClient.search as jest.Mock).mockRejectedValue(notFoundError);

      const result = await getFailureStoreSamples({
        params: { path: { name: 'logs.nginx.access' } },
        esClient,
        streamsClient,
        fieldsMetadataClient,
      });

      expect(result.documents).toEqual([]);
    });
  });

  describe('no ancestor processing', () => {
    it('returns raw docs when ancestors have no processing steps', async () => {
      const ancestorWithNoSteps = makeAncestor('logs', []);

      const { esClient, streamsClient, fieldsMetadataClient } = makeDeps({
        searchResponse: makeEsSearchResponse([baseDoc]),
        ancestors: [ancestorWithNoSteps],
      });

      const result = await getFailureStoreSamples({
        params: { path: { name: 'logs.nginx.access' } },
        esClient,
        streamsClient,
        fieldsMetadataClient,
      });

      expect(result.documents).toEqual([baseDoc]);
      expect(mockSimulateProcessing).not.toHaveBeenCalled();
    });
  });

  describe('ancestor processing applied', () => {
    it('calls simulateProcessing with only the ancestor steps', async () => {
      const ancestorStep = makeGrokStep('ancestor_field');
      const ancestor = makeAncestor('logs', [ancestorStep]);
      const processedDoc: FlattenRecord = { ...baseDoc, ancestor_field: 'parsed' };

      const { esClient, streamsClient, fieldsMetadataClient } = makeDeps({
        searchResponse: makeEsSearchResponse([baseDoc]),
        ancestors: [ancestor],
      });
      mockSimulateProcessing.mockResolvedValue(makeSimulationResponse([processedDoc]));

      const result = await getFailureStoreSamples({
        params: { path: { name: 'logs.nginx.access' } },
        esClient,
        streamsClient,
        fieldsMetadataClient,
      });

      expect(result.documents).toEqual([processedDoc]);
      expect(mockSimulateProcessing).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            body: expect.objectContaining({
              processing: { steps: [ancestorStep] },
            }),
          }),
        })
      );
    });

    it('regression: does not include the current stream processors in the pre-processing pass', async () => {
      // This is the bug fixed by PR #260535:
      // Before the fix, getStream(name) was called and the current stream's processors
      // were added to the pre-processing DSL. This caused documents to appear already-parsed
      // and then fail when the UI simulation ran those same processors a second time.
      const ancestorStep = makeGrokStep('ancestor_field');
      const ancestor = makeAncestor('logs', [ancestorStep]);

      const { esClient, streamsClient, fieldsMetadataClient } = makeDeps({
        searchResponse: makeEsSearchResponse([baseDoc]),
        ancestors: [ancestor],
      });
      mockSimulateProcessing.mockResolvedValue(makeSimulationResponse([baseDoc]));

      await getFailureStoreSamples({
        params: { path: { name: 'logs.nginx.access' } },
        esClient,
        streamsClient,
        fieldsMetadataClient,
      });

      const call = mockSimulateProcessing.mock.calls[0][0];
      const steps = call.params.body.processing.steps as StreamlangDSL['steps'];

      // Only the ancestor step must be present — no step from 'logs.nginx.access' itself
      expect(steps).toEqual([ancestorStep]);
      // Confirm getAncestors was called but getStream was not
      expect(streamsClient.getAncestors).toHaveBeenCalledWith('logs.nginx.access');
      expect(streamsClient.getStream).toBeUndefined();
    });

    it('applies ancestors from root to closest parent when multiple ancestors exist', async () => {
      const rootStep = makeGrokStep('root_field');
      const midStep = makeGrokStep('mid_field');
      // Deliberately provide them in reverse order to verify sort
      const mid = makeAncestor('logs.nginx', [midStep]);
      const root = makeAncestor('logs', [rootStep]);

      const { esClient, streamsClient, fieldsMetadataClient } = makeDeps({
        searchResponse: makeEsSearchResponse([baseDoc]),
        ancestors: [mid, root],
      });
      mockSimulateProcessing.mockResolvedValue(makeSimulationResponse([baseDoc]));

      await getFailureStoreSamples({
        params: { path: { name: 'logs.nginx.access' } },
        esClient,
        streamsClient,
        fieldsMetadataClient,
      });

      const call = mockSimulateProcessing.mock.calls[0][0];
      const steps = call.params.body.processing.steps as StreamlangDSL['steps'];

      expect(steps).toEqual([rootStep, midStep]);
    });
  });

  describe('time range filtering', () => {
    it('passes start and end to the ES query when provided', async () => {
      const { esClient, streamsClient, fieldsMetadataClient } = makeDeps({
        searchResponse: makeEsSearchResponse([baseDoc]),
      });

      await getFailureStoreSamples({
        params: {
          path: { name: 'logs.nginx' },
          query: { start: '2024-01-01T00:00:00.000Z', end: '2024-01-02T00:00:00.000Z' },
        },
        esClient,
        streamsClient,
        fieldsMetadataClient,
      });

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              must: [
                {
                  range: {
                    '@timestamp': {
                      gte: '2024-01-01T00:00:00.000Z',
                      lte: '2024-01-02T00:00:00.000Z',
                    },
                  },
                },
              ],
            },
          },
        })
      );
    });

    it('omits the query entirely when no time range is provided', async () => {
      const { esClient, streamsClient, fieldsMetadataClient } = makeDeps({
        searchResponse: makeEsSearchResponse([baseDoc]),
      });

      await getFailureStoreSamples({
        params: { path: { name: 'logs.nginx' } },
        esClient,
        streamsClient,
        fieldsMetadataClient,
      });

      const searchCall = (esClient.search as jest.Mock).mock.calls[0][0];
      expect(searchCall.query).toBeUndefined();
    });
  });
});
