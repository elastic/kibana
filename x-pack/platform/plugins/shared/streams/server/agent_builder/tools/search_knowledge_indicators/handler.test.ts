/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature, StreamQuery, Streams } from '@kbn/streams-schema';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { FeatureClient } from '../../../lib/streams/feature/feature_client';
import type { QueryClient } from '../../../lib/streams/assets/query/query_client';
import type { StreamsClient } from '../../../lib/streams/client';
import { searchKnowledgeIndicatorsToolHandler } from './handler';

function makeFeature(overrides: Partial<Feature> = {}): Feature {
  return {
    uuid: 'feature-uuid',
    id: 'feature-id',
    stream_name: 'logs.test',
    type: 'dataset_analysis',
    description: 'Feature description',
    properties: {},
    confidence: 90,
    status: 'active',
    last_seen: new Date().toISOString(),
    ...overrides,
  };
}

function makeStreamQuery(overrides: Partial<StreamQuery> = {}): StreamQuery {
  return {
    id: 'query-id',
    title: 'Query title',
    description: 'Query description',
    esql: { query: 'FROM logs-*' },
    ...overrides,
  };
}

describe('searchKnowledgeIndicatorsToolHandler', () => {
  const logger = loggingSystemMock.createLogger();

  const streamsClient = {
    listStreams: jest.fn(),
  } as unknown as StreamsClient;

  const featureClient = {
    getFeatures: jest.fn(),
  } as unknown as FeatureClient;

  const queryClient = {
    findQueries: jest.fn(),
    getQueryLinks: jest.fn(),
  } as unknown as QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns both features and queries when kind is omitted', async () => {
    streamsClient.listStreams = jest
      .fn()
      .mockResolvedValue([{ name: 'logs.test' } as Streams.all.Definition]);

    featureClient.getFeatures = jest
      .fn()
      .mockResolvedValue({ hits: [makeFeature({ id: 'f1', confidence: 80 })], total: 1 });

    queryClient.getQueryLinks = jest.fn().mockResolvedValue([
      {
        'asset.uuid': 'a1',
        'asset.type': 'query',
        'asset.id': 'q1',
        stream_name: 'logs.test',
        rule_backed: true,
        rule_id: 'rule-1',
        query: makeStreamQuery({ id: 'q1', severity_score: 75 }),
      },
    ]);

    const result = await searchKnowledgeIndicatorsToolHandler({
      streamsClient,
      featureClient,
      queryClient,
      logger,
      params: {},
    });

    expect(result.knowledge_indicators).toHaveLength(2);
    expect(result.knowledge_indicators[0].kind).toBe('feature');
    expect(result.knowledge_indicators[1].kind).toBe('query');
  });

  it('returns only queries when kind is [query] and does not call featureClient', async () => {
    streamsClient.listStreams = jest
      .fn()
      .mockResolvedValue([{ name: 'logs.test' } as Streams.all.Definition]);

    queryClient.getQueryLinks = jest.fn().mockResolvedValue([
      {
        'asset.uuid': 'a1',
        'asset.type': 'query',
        'asset.id': 'q1',
        stream_name: 'logs.test',
        rule_backed: false,
        rule_id: 'rule-1',
        query: makeStreamQuery({ id: 'q1' }),
      },
    ]);

    const result = await searchKnowledgeIndicatorsToolHandler({
      streamsClient,
      featureClient,
      queryClient,
      logger,
      params: { kind: ['query'] },
    });

    expect(featureClient.getFeatures).not.toHaveBeenCalled();
    expect(result.knowledge_indicators).toEqual([
      {
        kind: 'query',
        query: {
          id: 'q1',
          title: 'Query title',
          description: 'Query description',
          esql: { query: 'FROM logs-*' },
        },
        rule: {
          backed: false,
          id: 'rule-1',
        },
        stream_name: 'logs.test',
      },
    ]);
  });

  it('uses findQueries when search_text is provided', async () => {
    streamsClient.listStreams = jest
      .fn()
      .mockResolvedValue([{ name: 'logs.test' } as Streams.all.Definition]);

    queryClient.findQueries = jest.fn().mockResolvedValue([]);

    await searchKnowledgeIndicatorsToolHandler({
      streamsClient,
      featureClient,
      queryClient,
      logger,
      params: { search_text: 'payment' },
    });

    expect(queryClient.findQueries).toHaveBeenCalledWith(['logs.test'], 'payment', {
      ruleUnbacked: 'include',
    });
    expect(queryClient.getQueryLinks).not.toHaveBeenCalled();
  });

  it('filters requested streamNames against accessible streams', async () => {
    streamsClient.listStreams = jest
      .fn()
      .mockResolvedValue([{ name: 'logs.allowed' } as Streams.all.Definition]);

    featureClient.getFeatures = jest.fn().mockResolvedValue({ hits: [], total: 0 });
    queryClient.getQueryLinks = jest.fn().mockResolvedValue([]);

    await searchKnowledgeIndicatorsToolHandler({
      streamsClient,
      featureClient,
      queryClient,
      logger,
      params: { stream_names: ['logs.allowed', 'logs.not_allowed'] },
    });

    expect(featureClient.getFeatures).toHaveBeenCalledTimes(1);
    expect(featureClient.getFeatures).toHaveBeenCalledWith('logs.allowed', expect.any(Object));
    expect(queryClient.getQueryLinks).toHaveBeenCalledWith(['logs.allowed'], {
      ruleUnbacked: 'include',
    });
  });

  it('logs a debug message when feature retrieval fails for a stream', async () => {
    streamsClient.listStreams = jest
      .fn()
      .mockResolvedValue([
        { name: 'logs.bad' } as Streams.all.Definition,
        { name: 'logs.good' } as Streams.all.Definition,
      ]);

    featureClient.getFeatures = jest.fn().mockImplementation((streamName: string) => {
      if (streamName === 'logs.bad') {
        return Promise.reject(new Error('boom'));
      }
      return Promise.resolve({ hits: [makeFeature({ id: 'ok' })], total: 1 });
    });

    queryClient.getQueryLinks = jest.fn().mockResolvedValue([]);

    await searchKnowledgeIndicatorsToolHandler({
      streamsClient,
      featureClient,
      queryClient,
      logger,
      params: { kind: ['feature'] },
    });

    expect(logger.debug).toHaveBeenCalled();
  });
});
