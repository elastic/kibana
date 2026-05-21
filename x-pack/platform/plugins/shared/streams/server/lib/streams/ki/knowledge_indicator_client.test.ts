/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import {
  KnowledgeIndicatorClient,
  type KnowledgeIndicatorClientDeps,
} from './knowledge_indicator_client';
import {
  type StoredFeatureKnowledgeIndicator,
  type StoredKnowledgeIndicator,
  type StoredTombstone,
} from './data_stream';
import { KI_TYPE_FEATURE } from './fields';

jest.mock('../../sig_events/latest_source_query', () => ({
  runLatestSourceEsqlQuery: jest.fn(),
}));

jest.mock('./bulk_with_inference_fallback', () => ({
  bulkCreateWithInferenceFallback: jest.fn(async (_logger, attempt) =>
    attempt({ includeEmbedding: true })
  ),
}));

import { runLatestSourceEsqlQuery } from '../../sig_events/latest_source_query';

const STREAM = 'logs-app';
const SPACE = 'default';

function createFeatureDoc(
  overrides: Partial<StoredFeatureKnowledgeIndicator> = {}
): StoredFeatureKnowledgeIndicator {
  return {
    '@timestamp': '2026-01-01T00:00:00.000Z',
    id: 'feat-1',
    type: KI_TYPE_FEATURE,
    'stream.name': STREAM,
    title: 'Some entity',
    description: 'desc',
    feature: {
      type: 'entity',
      subtype: 'service',
      properties: { name: 'checkout' },
      confidence: 80,
    },
    ...overrides,
  };
}

function createComputedFeatureDoc(): StoredFeatureKnowledgeIndicator {
  return createFeatureDoc({
    id: 'computed-1',
    feature: {
      type: 'dataset_analysis',
      properties: {},
      confidence: 100,
    },
  });
}

function makeClient(): {
  client: KnowledgeIndicatorClient;
  create: jest.Mock;
  runEsql: jest.Mock;
  logger: Logger;
} {
  const create = jest.fn().mockResolvedValue({ errors: false, items: [] });
  const dataStreamClient = { create } as unknown as KnowledgeIndicatorClientDeps['dataStreamClient'];
  const logger = loggerMock.create() as unknown as Logger;
  const deps: KnowledgeIndicatorClientDeps = {
    dataStreamClient,
    esClient: {} as KnowledgeIndicatorClientDeps['esClient'],
    rulesClient: {} as KnowledgeIndicatorClientDeps['rulesClient'],
    soClient: {} as KnowledgeIndicatorClientDeps['soClient'],
    space: SPACE,
    logger,
  };
  const client = new KnowledgeIndicatorClient(deps);
  return { client, create, runEsql: runLatestSourceEsqlQuery as jest.Mock, logger };
}

beforeEach(() => {
  (runLatestSourceEsqlQuery as jest.Mock).mockReset();
});

describe('KnowledgeIndicatorClient.bulk', () => {
  describe('exclude', () => {
    it('reads the latest revision and appends a new one with excluded=true', async () => {
      const { client, create, runEsql } = makeClient();
      const latest = createFeatureDoc({ id: 'feat-1' });
      runEsql.mockResolvedValueOnce({ hits: [latest] });

      const result = await client.bulk(STREAM, [{ exclude: { id: 'feat-1' } }]);

      expect(result).toEqual({ applied: 1, skipped: 0 });
      expect(create).toHaveBeenCalledTimes(1);
      const [{ documents }] = create.mock.calls[0];
      expect(documents).toHaveLength(1);
      const written = documents[0] as StoredFeatureKnowledgeIndicator;
      expect(written.id).toBe('feat-1');
      expect(written.type).toBe(KI_TYPE_FEATURE);
      expect(written.excluded).toBe(true);
      // Payload preserved
      expect(written.feature).toEqual(latest.feature);
      expect(written.title).toBe(latest.title);
      // Fresh @timestamp
      expect(written['@timestamp']).not.toBe(latest['@timestamp']);
    });

    it('skips computed features', async () => {
      const { client, create, runEsql } = makeClient();
      runEsql.mockResolvedValueOnce({ hits: [createComputedFeatureDoc()] });

      const result = await client.bulk(STREAM, [{ exclude: { id: 'computed-1' } }]);

      expect(result).toEqual({ applied: 0, skipped: 1 });
      expect(create).not.toHaveBeenCalled();
    });

    it('skips when the latest revision is already excluded', async () => {
      const { client, create, runEsql } = makeClient();
      runEsql.mockResolvedValueOnce({ hits: [createFeatureDoc({ excluded: true })] });

      const result = await client.bulk(STREAM, [{ exclude: { id: 'feat-1' } }]);

      expect(result).toEqual({ applied: 0, skipped: 1 });
      expect(create).not.toHaveBeenCalled();
    });

    it('skips unknown ids', async () => {
      const { client, create, runEsql } = makeClient();
      runEsql.mockResolvedValueOnce({ hits: [] });

      const result = await client.bulk(STREAM, [{ exclude: { id: 'missing' } }]);

      expect(result).toEqual({ applied: 0, skipped: 1 });
      expect(create).not.toHaveBeenCalled();
    });
  });

  describe('restore', () => {
    it('appends a tombstone without a pre-read', async () => {
      const { client, create, runEsql } = makeClient();

      const result = await client.bulk(STREAM, [{ restore: { id: 'feat-1' } }]);

      expect(result).toEqual({ applied: 1, skipped: 0 });
      // No ES|QL probe.
      expect(runEsql).not.toHaveBeenCalled();
      expect(create).toHaveBeenCalledTimes(1);
      const [{ documents }] = create.mock.calls[0];
      expect(documents).toHaveLength(1);
      const written = documents[0] as StoredTombstone;
      expect(written.id).toBe('feat-1');
      expect(written.type).toBe(KI_TYPE_FEATURE);
      expect(written.deleted).toBe(true);
      expect(written['stream.name']).toBe(STREAM);
    });
  });

  describe('delete', () => {
    it('appends a tombstone without a pre-read', async () => {
      const { client, create, runEsql } = makeClient();

      const result = await client.bulk(STREAM, [
        { delete: { type: KI_TYPE_FEATURE, id: 'feat-1' } },
      ]);

      expect(result).toEqual({ applied: 1, skipped: 0 });
      expect(runEsql).not.toHaveBeenCalled();
      expect(create).toHaveBeenCalledTimes(1);
      const [{ documents }] = create.mock.calls[0];
      const written = documents[0] as StoredTombstone;
      expect(written.deleted).toBe(true);
    });
  });
});

describe('KnowledgeIndicatorClient.getFeatures', () => {
  it('hides excluded features by default', async () => {
    const { client, runEsql } = makeClient();
    runEsql.mockResolvedValueOnce({ hits: [createFeatureDoc()] });

    await client.getFeatures(STREAM);

    expect(runEsql).toHaveBeenCalledTimes(1);
    const args = runEsql.mock.calls[0][0];
    const printedFilter = args.postGroupingWhere?.toString
      ? args.postGroupingWhere.toString()
      : JSON.stringify(args.postGroupingWhere);
    // We can't easily compare AST objects; sanity check that a filter is set.
    expect(args.postGroupingWhere).toBeDefined();
    // The default filter must include `excluded` — distinct from the
    // tombstone-only filter applied when includeExcluded=true.
    expect(JSON.stringify(args.postGroupingWhere)).toContain('excluded');
    expect(printedFilter).toBeDefined();
  });

  it('returns active and excluded merged when includeExcluded is set', async () => {
    const { client, runEsql } = makeClient();
    const active = createFeatureDoc({ id: 'a' });
    const excluded = createFeatureDoc({ id: 'b', excluded: true });
    runEsql.mockResolvedValueOnce({ hits: [active, excluded] });

    const { hits } = await client.getFeatures(STREAM, { includeExcluded: true });

    expect(hits).toHaveLength(2);
    const args = runEsql.mock.calls[0][0];
    // includeExcluded relaxes back to the tombstone-only filter — should not
    // mention `excluded`.
    expect(JSON.stringify(args.postGroupingWhere)).not.toContain('excluded');
    expect(hits.find((h) => h.id === 'b')?.excluded).toBe(true);
  });
});

describe('KnowledgeIndicatorClient.getExcludedFeatures', () => {
  it('returns only excluded features sorted by updated_at desc', async () => {
    const { client, runEsql } = makeClient();
    const older = createFeatureDoc({
      id: 'old',
      excluded: true,
      '@timestamp': '2026-01-01T00:00:00.000Z',
    });
    const newer = createFeatureDoc({
      id: 'new',
      excluded: true,
      '@timestamp': '2026-02-01T00:00:00.000Z',
    });
    runEsql.mockResolvedValueOnce({ hits: [older, newer] });

    const { hits } = await client.getExcludedFeatures(STREAM);

    expect(hits.map((h) => h.id)).toEqual(['new', 'old']);
    expect(hits.every((h) => h.excluded === true)).toBe(true);
  });
});

describe('KnowledgeIndicatorClient.refreshExcludedFeatures', () => {
  it('appends a fresh excluded revision per currently-excluded feature', async () => {
    const { client, create, runEsql } = makeClient();
    const original: StoredFeatureKnowledgeIndicator = createFeatureDoc({
      id: 'feat-1',
      excluded: true,
      '@timestamp': '2026-01-01T00:00:00.000Z',
    });
    runEsql.mockResolvedValueOnce({ hits: [original] });

    const { refreshed } = await client.refreshExcludedFeatures(STREAM);

    expect(refreshed).toBe(1);
    expect(create).toHaveBeenCalledTimes(1);
    const [{ documents }] = create.mock.calls[0];
    expect(documents).toHaveLength(1);
    const written = documents[0] as StoredFeatureKnowledgeIndicator;
    expect(written.id).toBe('feat-1');
    expect(written.excluded).toBe(true);
    expect(written['@timestamp']).not.toBe(original['@timestamp']);
    expect(written.feature).toEqual(original.feature);
  });

  it('is a no-op when nothing is excluded', async () => {
    const { client, create, runEsql } = makeClient();
    runEsql.mockResolvedValueOnce({ hits: [] as StoredKnowledgeIndicator[] });

    const { refreshed } = await client.refreshExcludedFeatures(STREAM);

    expect(refreshed).toBe(0);
    expect(create).not.toHaveBeenCalled();
  });
});
