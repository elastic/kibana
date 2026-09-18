/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { DEFAULT_MAX_EXISTING_QUERIES_FOR_CONTEXT } from '@kbn/nightshift-ai';
import type { Streams } from '@kbn/streams-schema';
import type { GetScopedClients, RouteHandlerScopedClients } from '../../../../routes/types';
import { createMockToolContext, invokeHandler } from '../../../utils/test_helpers';
import { createGetFeaturesTool } from './tool';

describe('ki_features_get tool', () => {
  const logger = loggingSystemMock.createLogger();
  const stream: Streams.WiredStream.Definition = {
    name: 'logs.test',
    description: 'Test logs',
    updated_at: new Date().toISOString(),
    type: 'wired',
    ingest: {
      lifecycle: { inherit: {} },
      processing: { steps: [], updated_at: new Date().toISOString() },
      settings: {},
      failure_store: { inherit: {} },
      wired: { fields: {}, routing: [] },
    },
  };
  const getStream = jest.fn().mockResolvedValue(stream);
  const getFeatures = jest.fn();
  const getStreamToQueryLinksMap = jest.fn();
  const getScopedClients = jest.fn(async () => {
    return {
      streamsClient: { getStream },
      getKnowledgeIndicatorClient: jest
        .fn()
        .mockResolvedValue({ getFeatures, getStreamToQueryLinksMap }),
    } as unknown as RouteHandlerScopedClients;
  }) as unknown as jest.MockedFunction<GetScopedClients>;

  const existingQuery = {
    id: 'query-1',
    title: 'Error rate',
    type: 'stats',
    severity_score: 65,
    description: 'Tracks error rate',
    esql: { query: 'FROM logs | STATS errors = COUNT(*) BY bucket = BUCKET(@timestamp, 1 minute)' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getFeatures.mockResolvedValue({
      hits: [
        {
          id: 'feature-1',
          run_id: 'run-1',
          stream_name: 'logs.test',
          type: 'entity',
          title: 'Checkout',
          description: 'Checkout service',
          confidence: 95,
          properties: { service: 'checkout' },
        },
      ],
    });
    getStreamToQueryLinksMap.mockResolvedValue({
      'logs.test': [{ query: existingQuery }],
    });
  });

  const createTool = () =>
    createGetFeaturesTool({
      getScopedClients,
      logger,
    });

  it('bounds its input', () => {
    const tool = createTool();
    if (!('schema' in tool)) {
      throw new Error('Expected a schema-backed tool registration');
    }

    expect(tool.schema.safeParse({ target_id: 'logs.test', limit: 100 }).success).toBe(true);
    expect(tool.schema.safeParse({ target_id: 'logs.test', limit: 101 }).success).toBe(false);
  });

  it('loads features for an authorized target', async () => {
    const result = await invokeHandler(
      createTool(),
      {
        target_id: 'logs.test',
        feature_types: ['entity'],
        min_confidence: 70,
        limit: 25,
      },
      createMockToolContext()
    );
    if (!('results' in result)) {
      throw new Error('Expected a standard tool result');
    }

    expect(getStream).toHaveBeenCalledWith('logs.test');
    expect(getFeatures).toHaveBeenCalledWith('logs.test', {
      type: ['entity'],
      minConfidence: 70,
      limit: 25,
      excludedType: ['log_samples'],
    });
    expect(result.results).toEqual([
      {
        type: 'other',
        data: {
          count: 1,
          features: [
            expect.objectContaining({
              id: 'feature-1',
              type: 'entity',
              title: 'Checkout',
            }),
          ],
          existing_queries: [
            {
              id: 'query-1',
              title: 'Error rate',
              type: 'stats',
              severity_score: 65,
              description: 'Tracks error rate',
              esql: 'FROM logs | STATS errors = COUNT(*) BY bucket = BUCKET(@timestamp, 1 minute)',
            },
          ],
        },
      },
    ]);
  });

  it('bounds existing queries surfaced to the LLM by severity, count and description length', async () => {
    const longDescription = 'x'.repeat(250);
    const links = Array.from({ length: DEFAULT_MAX_EXISTING_QUERIES_FOR_CONTEXT + 5 }, (_, i) => ({
      query: {
        ...existingQuery,
        id: `query-${i}`,
        severity_score: i,
        description: longDescription,
      },
    }));
    getStreamToQueryLinksMap.mockResolvedValue({ 'logs.test': links });

    const result = await invokeHandler(
      createTool(),
      { target_id: 'logs.test' },
      createMockToolContext()
    );
    if (!('results' in result)) {
      throw new Error('Expected a standard tool result');
    }

    const { existing_queries: existingQueries } = result.results[0].data as {
      existing_queries: Array<{ id: string; severity_score: number; description: string }>;
    };
    expect(existingQueries).toHaveLength(DEFAULT_MAX_EXISTING_QUERIES_FOR_CONTEXT);
    expect(existingQueries[0].severity_score).toBe(DEFAULT_MAX_EXISTING_QUERIES_FOR_CONTEXT + 4);
    expect(existingQueries.at(-1)?.severity_score).toBe(5);
    expect(existingQueries[0].description).toHaveLength(200);
  });

  it('does not read internally stored features when target authorization fails', async () => {
    getStream.mockRejectedValueOnce(new Error('insufficient privileges'));

    const result = await invokeHandler(
      createTool(),
      { target_id: 'logs.restricted' },
      createMockToolContext()
    );
    if (!('results' in result)) {
      throw new Error('Expected a standard tool result');
    }

    expect(getFeatures).not.toHaveBeenCalled();
    expect(result.results).toEqual([
      { type: 'error', data: { message: 'insufficient privileges' } },
    ]);
  });
});
