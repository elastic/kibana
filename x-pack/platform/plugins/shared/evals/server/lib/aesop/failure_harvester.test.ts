/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  indexFailures,
  harvestRegressionCases,
  createRegressionDatasetExamples,
} from './failure_harvester';

const createMockEsClient = () =>
  ({
    indices: {
      exists: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockResolvedValue({}),
    },
    bulk: jest.fn().mockResolvedValue({ items: [] }),
    search: jest.fn().mockResolvedValue({ aggregations: {} }),
  } as unknown as jest.Mocked<ElasticsearchClient>);

const createMockDatasetClient = () => ({
  upsert: jest.fn().mockResolvedValue({ dataset_id: 'ds-123', added: 2, removed: 0, unchanged: 0 }),
});

describe('failure_harvester', () => {
  let esClient: jest.Mocked<ElasticsearchClient>;
  let logger: Logger;

  beforeEach(() => {
    esClient = createMockEsClient();
    logger = loggingSystemMock.createLogger();
    jest.clearAllMocks();
  });

  describe('indexFailures', () => {
    const baseResults = [
      { itemIndex: 0, evaluator: 'skill-accuracy', score: 0.1, label: 'fail', explanation: 'bad' },
      { itemIndex: 1, evaluator: 'skill-accuracy', score: 0.8, label: 'pass', explanation: 'good' },
      { itemIndex: 0, evaluator: 'skill-safety', score: 0.2, label: 'fail', explanation: 'unsafe' },
    ];

    const baseItems = [
      { input: { query: 'What is Kibana?' }, output: 'Kibana is a tool' },
      { input: { query: 'How to create an index?' }, output: 'Use PUT /index-name' },
    ];

    it('returns 0 when no results are below threshold', async () => {
      const passingResults = [{ itemIndex: 0, evaluator: 'accuracy', score: 0.9, label: 'pass' }];
      const count = await indexFailures(
        esClient,
        'run-1',
        'skill-1',
        passingResults,
        baseItems,
        logger
      );
      expect(count).toBe(0);
      expect(esClient.bulk).not.toHaveBeenCalled();
    });

    it('returns 0 when results have null scores', async () => {
      const nullResults = [{ itemIndex: 0, evaluator: 'accuracy', score: null }];
      const count = await indexFailures(
        esClient,
        'run-1',
        'skill-1',
        nullResults,
        baseItems,
        logger
      );
      expect(count).toBe(0);
    });

    it('indexes failures below the default threshold (0.3)', async () => {
      (esClient.bulk as jest.Mock).mockResolvedValueOnce({
        items: [{ create: { status: 201 } }, { create: { status: 201 } }],
      });

      const count = await indexFailures(
        esClient,
        'run-1',
        'skill-1',
        baseResults,
        baseItems,
        logger
      );
      expect(count).toBe(2);
      expect(esClient.bulk).toHaveBeenCalledTimes(1);

      const { operations } = (esClient.bulk as jest.Mock).mock.calls[0][0];
      // 2 failures × 2 (action + doc) = 4 operations
      expect(operations).toHaveLength(4);
    });

    it('creates the failures index if it does not exist', async () => {
      (esClient.bulk as jest.Mock).mockResolvedValueOnce({
        items: [{ create: { status: 201 } }],
      });

      await indexFailures(esClient, 'run-1', 'skill-1', baseResults, baseItems, logger);

      expect(esClient.indices.exists as jest.Mock).toHaveBeenCalled();
      expect(esClient.indices.create as jest.Mock).toHaveBeenCalled();
    });

    it('skips index creation when index already exists', async () => {
      (esClient.indices.exists as jest.Mock).mockResolvedValueOnce(true);
      (esClient.bulk as jest.Mock).mockResolvedValueOnce({
        items: [{ create: { status: 201 } }],
      });

      await indexFailures(esClient, 'run-1', 'skill-1', baseResults, baseItems, logger);

      expect(esClient.indices.create as jest.Mock).not.toHaveBeenCalled();
    });

    it('uses deterministic document IDs', async () => {
      (esClient.bulk as jest.Mock).mockResolvedValueOnce({
        items: [{ create: { status: 201 } }],
      });

      await indexFailures(esClient, 'run-1', 'skill-1', baseResults, baseItems, logger);

      const { operations } = (esClient.bulk as jest.Mock).mock.calls[0][0];
      const createOps = operations.filter((op: Record<string, unknown>) => 'create' in op);
      for (const op of createOps) {
        expect(op.create._id).toMatch(/^skill-1:[a-f0-9]+:/);
      }
    });

    it('counts 409 (duplicate) responses as indexed', async () => {
      (esClient.bulk as jest.Mock).mockResolvedValueOnce({
        items: [{ create: { status: 409 } }, { create: { status: 201 } }],
      });

      const count = await indexFailures(
        esClient,
        'run-1',
        'skill-1',
        baseResults,
        baseItems,
        logger
      );
      expect(count).toBe(2);
    });

    it('truncates output to 500 chars', async () => {
      const longOutput = 'x'.repeat(1000);
      const items = [{ input: { query: 'test' }, output: longOutput }];
      const results = [{ itemIndex: 0, evaluator: 'acc', score: 0.1 }];

      (esClient.bulk as jest.Mock).mockResolvedValueOnce({
        items: [{ create: { status: 201 } }],
      });

      await indexFailures(esClient, 'run-1', 'skill-1', results, items, logger);

      const { operations } = (esClient.bulk as jest.Mock).mock.calls[0][0];
      const doc = operations[1];
      expect(doc.output_snippet.length).toBe(500);
    });

    it('respects custom failureThreshold', async () => {
      const results = [{ itemIndex: 0, evaluator: 'acc', score: 0.4 }];

      await indexFailures(esClient, 'run-1', 'skill-1', results, baseItems, logger, {
        failureThreshold: 0.5,
      });
      // 0.4 < 0.5 threshold → should be indexed
      expect(esClient.bulk).toHaveBeenCalled();
    });

    it('skips items with out-of-range itemIndex', async () => {
      const results = [{ itemIndex: 99, evaluator: 'acc', score: 0.1 }];

      const count = await indexFailures(esClient, 'run-1', 'skill-1', results, baseItems, logger);
      expect(count).toBe(0);
    });
  });

  describe('harvestRegressionCases', () => {
    it('returns empty array when index does not exist', async () => {
      (esClient.indices.exists as jest.Mock).mockResolvedValueOnce(false);

      const cases = await harvestRegressionCases(esClient, 'skill-1');
      expect(cases).toEqual([]);
      expect(esClient.search).not.toHaveBeenCalled();
    });

    it('returns regression cases from aggregation buckets', async () => {
      (esClient.indices.exists as jest.Mock).mockResolvedValueOnce(true);
      (esClient.search as jest.Mock).mockResolvedValueOnce({
        aggregations: {
          by_input: {
            buckets: [
              {
                key: 'hash-abc',
                doc_count: 5,
                sample: {
                  hits: {
                    hits: [
                      {
                        _source: {
                          input_query: 'What is Kibana?',
                          '@timestamp': '2025-01-01T00:00:00Z',
                        },
                      },
                    ],
                  },
                },
                evaluators: {
                  buckets: [{ key: 'skill-accuracy' }, { key: 'skill-safety' }],
                },
              },
            ],
          },
        },
      });

      const cases = await harvestRegressionCases(esClient, 'skill-1');
      expect(cases).toHaveLength(1);
      expect(cases[0]).toMatchObject({
        inputQuery: 'What is Kibana?',
        inputHash: 'hash-abc',
        failureCount: 5,
        evaluatorsFailed: ['skill-accuracy', 'skill-safety'],
        lastSeen: '2025-01-01T00:00:00Z',
      });
    });

    it('returns empty array when no buckets', async () => {
      (esClient.indices.exists as jest.Mock).mockResolvedValueOnce(true);
      (esClient.search as jest.Mock).mockResolvedValueOnce({
        aggregations: { by_input: { buckets: [] } },
      });

      const cases = await harvestRegressionCases(esClient, 'skill-1');
      expect(cases).toEqual([]);
    });

    it('passes minCount and timeRange to the query', async () => {
      (esClient.indices.exists as jest.Mock).mockResolvedValueOnce(true);
      (esClient.search as jest.Mock).mockResolvedValueOnce({
        aggregations: { by_input: { buckets: [] } },
      });

      await harvestRegressionCases(esClient, 'skill-1', { minCount: 5, timeRange: '30d' });

      const searchCall = (esClient.search as jest.Mock).mock.calls[0][0];
      expect(searchCall.aggs.by_input.terms.min_doc_count).toBe(5);
      expect(searchCall.query.bool.filter).toEqual(
        expect.arrayContaining([{ range: { '@timestamp': { gte: 'now-30d' } } }])
      );
    });
  });

  describe('createRegressionDatasetExamples', () => {
    it('returns empty result when no cases', async () => {
      const datasetClient = createMockDatasetClient();

      const result = await createRegressionDatasetExamples(datasetClient, 'skill-1', []);
      expect(result).toEqual({ datasetId: '', added: 0 });
      expect(datasetClient.upsert).not.toHaveBeenCalled();
    });

    it('calls upsert with regression examples', async () => {
      const datasetClient = createMockDatasetClient();
      const cases = [
        {
          inputQuery: 'What is Kibana?',
          inputHash: 'hash-1',
          failureCount: 5,
          evaluatorsFailed: ['skill-accuracy'],
          lastSeen: '2025-01-01T00:00:00Z',
        },
      ];

      const result = await createRegressionDatasetExamples(datasetClient, 'skill-1', cases);

      expect(result).toEqual({ datasetId: 'ds-123', added: 2 });
      expect(datasetClient.upsert).toHaveBeenCalledWith(
        'skill-eval:skill-1',
        expect.stringContaining('skill-1'),
        expect.arrayContaining([
          expect.objectContaining({
            input: { query: 'What is Kibana?' },
            metadata: expect.objectContaining({
              source: 'regression',
              failure_count: 5,
              input_hash: 'hash-1',
            }),
          }),
        ])
      );
    });
  });
});
