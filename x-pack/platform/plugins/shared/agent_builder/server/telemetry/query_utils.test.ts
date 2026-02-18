/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { QueryUtils, isIndexNotFoundError } from './query_utils';

describe('query_utils', () => {
  describe('isIndexNotFoundError', () => {
    it('returns true for error with caused_by.type = index_not_found_exception', () => {
      const error = {
        attributes: {
          caused_by: {
            type: 'index_not_found_exception',
          },
        },
      };
      expect(isIndexNotFoundError(error)).toBe(true);
    });

    it('returns true for error with error.caused_by.type = index_not_found_exception', () => {
      const error = {
        attributes: {
          error: {
            caused_by: {
              type: 'index_not_found_exception',
            },
          },
        },
      };
      expect(isIndexNotFoundError(error)).toBe(true);
    });

    it('returns false for other error types', () => {
      const error = {
        attributes: {
          caused_by: {
            type: 'some_other_exception',
          },
        },
      };
      expect(isIndexNotFoundError(error)).toBe(false);
    });

    it('returns false for error without attributes', () => {
      const error = new Error('Regular error');
      expect(isIndexNotFoundError(error)).toBe(false);
    });

    it('returns false for null', () => {
      expect(isIndexNotFoundError(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isIndexNotFoundError(undefined)).toBe(false);
    });

    it('returns true for error with meta.body.error.type = index_not_found_exception', () => {
      const error = {
        meta: {
          body: {
            error: {
              type: 'index_not_found_exception',
            },
          },
        },
      };
      expect(isIndexNotFoundError(error)).toBe(true);
    });

    it('returns true for error with message containing index_not_found_exception', () => {
      const error = {
        message: 'index_not_found_exception: no such index [.chat-tools]',
      };
      expect(isIndexNotFoundError(error)).toBe(true);
    });

    it('returns false for primitive values', () => {
      expect(isIndexNotFoundError('string')).toBe(false);
      expect(isIndexNotFoundError(123)).toBe(false);
      expect(isIndexNotFoundError(true)).toBe(false);
    });
  });

  describe('QueryUtils', () => {
    let esClient: jest.Mocked<ElasticsearchClient>;
    let soClient: jest.Mocked<SavedObjectsClientContract>;
    let logger: MockedLogger;
    let queryUtils: QueryUtils;

    beforeEach(() => {
      esClient = {
        search: jest.fn(),
        count: jest.fn(),
      } as unknown as jest.Mocked<ElasticsearchClient>;

      soClient = {
        find: jest.fn(),
      } as unknown as jest.Mocked<SavedObjectsClientContract>;

      logger = loggerMock.create();
      queryUtils = new QueryUtils(esClient, soClient, logger);
      jest.useFakeTimers().setSystemTime(new Date('2024-01-02T00:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.clearAllMocks();
    });

    describe('getCountersByDomain', () => {
      it('returns usage counter data for the specified domain', async () => {
        soClient.find.mockResolvedValue({
          saved_objects: [
            {
              id: '1',
              type: 'usage-counter',
              attributes: {
                domainId: 'agentBuilder',
                counterName: 'tool_call_default_agent',
                counterType: 'count',
                count: 10,
              },
              references: [],
              score: 1,
            },
            {
              id: '2',
              type: 'usage-counter',
              attributes: {
                domainId: 'agentBuilder',
                counterName: 'tool_call_mcp',
                counterType: 'count',
                count: 5,
              },
              references: [],
              score: 1,
            },
          ],
          total: 2,
          page: 1,
          per_page: 10000,
        });

        const result = await queryUtils.getCountersByDomain('agentBuilder');

        expect(soClient.find).toHaveBeenCalledWith({
          type: 'usage-counter',
          perPage: 10000,
          filter:
            'usage-counter.attributes.domainId:"agentBuilder" and usage-counter.updated_at >= "2024-01-01T00:00:00.000Z"',
        });

        expect(result).toEqual([
          {
            counterName: 'tool_call_default_agent',
            counterType: 'count',
            count: 10,
            domainId: 'agentBuilder',
          },
          {
            counterName: 'tool_call_mcp',
            counterType: 'count',
            count: 5,
            domainId: 'agentBuilder',
          },
        ]);
      });

      it('returns empty array when no counters found', async () => {
        soClient.find.mockResolvedValue({
          saved_objects: [],
          total: 0,
          page: 1,
          per_page: 10000,
        });

        const result = await queryUtils.getCountersByDomain('agentBuilder');

        expect(result).toEqual([]);
      });

      it('returns empty array and logs error on exception', async () => {
        soClient.find.mockRejectedValue(new Error('Database error'));

        const result = await queryUtils.getCountersByDomain('agentBuilder');

        expect(result).toEqual([]);
        expect(logger.error).toHaveBeenCalledWith('Failed to query usage counters: Database error');
      });
    });

    describe('getCountersByPrefix', () => {
      it('returns map of counters filtered by prefix', async () => {
        soClient.find.mockResolvedValue({
          saved_objects: [
            {
              id: '1',
              type: 'usage-counter',
              attributes: {
                domainId: 'agentBuilder',
                counterName: 'tool_call_default_agent',
                counterType: 'count',
                count: 10,
              },
              references: [],
              score: 1,
            },
            {
              id: '2',
              type: 'usage-counter',
              attributes: {
                domainId: 'agentBuilder',
                counterName: 'tool_call_mcp',
                counterType: 'count',
                count: 5,
              },
              references: [],
              score: 1,
            },
            {
              id: '3',
              type: 'usage-counter',
              attributes: {
                domainId: 'agentBuilder',
                counterName: 'error_total',
                counterType: 'count',
                count: 2,
              },
              references: [],
              score: 1,
            },
          ],
          total: 3,
          page: 1,
          per_page: 10000,
        });

        const result = await queryUtils.getCountersByPrefix('agentBuilder', 'tool_call_');

        expect(result.size).toBe(2);
        expect(result.get('tool_call_default_agent')).toBe(10);
        expect(result.get('tool_call_mcp')).toBe(5);
        expect(result.has('error_total')).toBe(false);
      });

      it('returns empty map when no counters match prefix', async () => {
        soClient.find.mockResolvedValue({
          saved_objects: [
            {
              id: '1',
              type: 'usage-counter',
              attributes: {
                domainId: 'agentBuilder',
                counterName: 'error_total',
                counterType: 'count',
                count: 2,
              },
              references: [],
              score: 1,
            },
          ],
          total: 1,
          page: 1,
          per_page: 10000,
        });

        const result = await queryUtils.getCountersByPrefix('agentBuilder', 'tool_call_');

        expect(result.size).toBe(0);
      });

      it('returns empty map and logs error on exception', async () => {
        soClient.find.mockRejectedValue(new Error('Database error'));

        const result = await queryUtils.getCountersByPrefix('agentBuilder', 'tool_call_');

        expect(result.size).toBe(0);
        // The error is logged in getCountersByDomain which is called internally
        expect(logger.error).toHaveBeenCalledWith('Failed to query usage counters: Database error');
      });
    });

    describe('getCustomToolsMetrics', () => {
      it('returns custom tools metrics with aggregation data', async () => {
        esClient.search.mockResolvedValue({
          took: 1,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 0, relation: 'eq' }, hits: [] },
          aggregations: {
            by_type: {
              buckets: [
                { key: 'esql', doc_count: 5 },
                { key: 'index_search', doc_count: 3 },
                { key: 'workflow', doc_count: 2 },
              ],
            },
          },
        });

        const result = await queryUtils.getCustomToolsMetrics();

        expect(result).toEqual({
          total: 10,
          by_type: [
            { type: 'esql', count: 5 },
            { type: 'index_search', count: 3 },
            { type: 'workflow', count: 2 },
          ],
        });
      });

      it('returns empty metrics when no aggregations', async () => {
        esClient.search.mockResolvedValue({
          took: 1,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 0, relation: 'eq' }, hits: [] },
          aggregations: {},
        });

        const result = await queryUtils.getCustomToolsMetrics();

        expect(result).toEqual({
          total: 0,
          by_type: [],
        });
      });

      it('excludes builtin tools from query', async () => {
        esClient.search.mockResolvedValue({
          took: 1,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 0, relation: 'eq' }, hits: [] },
          aggregations: {
            by_type: {
              buckets: [],
            },
          },
        });

        await queryUtils.getCustomToolsMetrics();

        expect(esClient.search).toHaveBeenCalledWith(
          expect.objectContaining({
            query: {
              bool: {
                must_not: [
                  {
                    term: {
                      type: 'builtin',
                    },
                  },
                ],
              },
            },
          })
        );
      });

      it('returns default values and logs warning on error', async () => {
        esClient.search.mockRejectedValue(new Error('ES error'));

        const result = await queryUtils.getCustomToolsMetrics();

        expect(result).toEqual({
          total: 0,
          by_type: [],
        });
        expect(logger.warn).toHaveBeenCalledWith('Failed to fetch custom tools counts: ES error');
      });

      it('does not log warning for index_not_found_exception', async () => {
        const error = {
          message: 'index_not_found_exception: no such index [.chat-tools]',
        };
        esClient.search.mockRejectedValue(error);

        const result = await queryUtils.getCustomToolsMetrics();

        expect(result).toEqual({
          total: 0,
          by_type: [],
        });
        expect(logger.warn).not.toHaveBeenCalled();
      });
    });

    describe('getCustomAgentsMetrics', () => {
      it('returns custom agents count', async () => {
        esClient.count.mockResolvedValue({
          count: 15,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        });

        const result = await queryUtils.getCustomAgentsMetrics();

        expect(result).toBe(15);
      });

      it('returns 0 when count is undefined', async () => {
        esClient.count.mockResolvedValue({
          count: undefined as any,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        });

        const result = await queryUtils.getCustomAgentsMetrics();

        expect(result).toBe(0);
      });

      it('returns 0 and logs warning on error', async () => {
        esClient.count.mockRejectedValue(new Error('ES error'));

        const result = await queryUtils.getCustomAgentsMetrics();

        expect(result).toBe(0);
        expect(logger.warn).toHaveBeenCalledWith('Failed to fetch custom agents count: ES error');
      });

      it('does not log warning for index_not_found_exception', async () => {
        const error = {
          message: 'index_not_found_exception: no such index [.chat-agents]',
        };
        esClient.count.mockRejectedValue(error);

        const result = await queryUtils.getCustomAgentsMetrics();

        expect(result).toBe(0);
        expect(logger.warn).not.toHaveBeenCalled();
      });
    });

    describe('getConversationMetrics', () => {
      it('returns conversation metrics with aggregation data', async () => {
        esClient.search.mockResolvedValue({
          took: 1,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 100, relation: 'eq' }, hits: [] },
          aggregations: {
            rounds_distribution: {
              buckets: [
                { key: '1-5', doc_count: 60 },
                { key: '6-10', doc_count: 25 },
                { key: '11-20', doc_count: 10 },
                { key: '21-50', doc_count: 4 },
                { key: '51+', doc_count: 1 },
              ],
            },
            total_tokens: {
              value: 50000,
            },
          },
        });

        const result = await queryUtils.getConversationMetrics();

        expect(result).toEqual({
          total: 100,
          total_rounds: 60 * 3 + 25 * 8 + 10 * 15 + 4 * 35 + 1 * 75, // = 180 + 200 + 150 + 140 + 75 = 745
          avg_rounds_per_conversation: 7.45,
          rounds_distribution: [
            { bucket: '1-5', count: 60 },
            { bucket: '6-10', count: 25 },
            { bucket: '11-20', count: 10 },
            { bucket: '21-50', count: 4 },
            { bucket: '51+', count: 1 },
          ],
          tokens_used: 50000,
          average_tokens_per_conversation: 500,
        });
      });

      it('handles total as number (not object)', async () => {
        esClient.search.mockResolvedValue({
          took: 1,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: 50, hits: [] },
          aggregations: {
            rounds_distribution: {
              buckets: [{ key: '1-5', doc_count: 50 }],
            },
            total_tokens: {
              value: 10000,
            },
          },
        });

        const result = await queryUtils.getConversationMetrics();

        expect(result.total).toBe(50);
        expect(result.average_tokens_per_conversation).toBe(200);
      });

      it('returns 0 for average when no conversations', async () => {
        esClient.search.mockResolvedValue({
          took: 1,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 0, relation: 'eq' }, hits: [] },
          aggregations: {
            rounds_distribution: {
              buckets: [],
            },
            total_tokens: {
              value: 0,
            },
          },
        });

        const result = await queryUtils.getConversationMetrics();

        expect(result).toEqual({
          total: 0,
          total_rounds: 0,
          avg_rounds_per_conversation: 0,
          rounds_distribution: [],
          tokens_used: 0,
          average_tokens_per_conversation: 0,
        });
      });

      it('does not log warning for index_not_found_exception', async () => {
        const error = {
          message: 'index_not_found_exception',
          attributes: {
            caused_by: {
              type: 'index_not_found_exception',
            },
          },
        };
        esClient.search.mockRejectedValue(error);

        const result = await queryUtils.getConversationMetrics();

        expect(result.total).toBe(0);
        expect(logger.warn).not.toHaveBeenCalled();
      });

      it('logs warning for other errors', async () => {
        esClient.search.mockRejectedValue(new Error('ES error'));

        const result = await queryUtils.getConversationMetrics();

        expect(result).toEqual({
          total: 0,
          total_rounds: 0,
          avg_rounds_per_conversation: 0,
          rounds_distribution: [],
          tokens_used: 0,
          average_tokens_per_conversation: 0,
        });
        expect(logger.warn).toHaveBeenCalledWith('Failed to fetch conversation metrics: ES error');
      });
    });

    describe('calculatePercentilesFromBuckets', () => {
      it('returns all zeros for empty buckets', () => {
        const buckets = new Map<string, number>();

        const result = queryUtils.calculatePercentilesFromBuckets(buckets, 'agent_builder');

        expect(result).toEqual({
          p50: 0,
          p75: 0,
          p90: 0,
          p95: 0,
          p99: 0,
          mean: 0,
        });
      });

      it('calculates percentiles for single bucket', () => {
        const buckets = new Map<string, number>([['agent_builder_query_to_result_time_<1s', 100]]);

        const result = queryUtils.calculatePercentilesFromBuckets(buckets, 'agent_builder');

        // All percentiles should be within the <1s bucket (0-1000ms)
        expect(result.p50).toBe(500); // 50% of 100 = 50, linear interpolation in 0-1000
        expect(result.p75).toBe(750);
        expect(result.p90).toBe(900);
        expect(result.p95).toBe(950);
        expect(result.p99).toBe(990);
        expect(result.mean).toBe(500); // midpoint of bucket
      });

      it('calculates percentiles for multiple buckets', () => {
        const buckets = new Map<string, number>([
          ['agent_builder_query_to_result_time_<1s', 50],
          ['agent_builder_query_to_result_time_1-5s', 30],
          ['agent_builder_query_to_result_time_5-10s', 15],
          ['agent_builder_query_to_result_time_10-30s', 4],
          ['agent_builder_query_to_result_time_30s+', 1],
        ]);

        const result = queryUtils.calculatePercentilesFromBuckets(buckets, 'agent_builder');

        // Total count = 100
        // p50 (50th item) should be in <1s bucket
        expect(result.p50).toBe(1000); // At 50%, we're at the boundary of first bucket
        // p75 (75th item) should be in 1-5s bucket
        expect(result.p75).toBeGreaterThan(1000);
        expect(result.p75).toBeLessThanOrEqual(5000);
        // p90 (90th item) should be in 5-10s bucket
        expect(result.p90).toBeGreaterThanOrEqual(5000);
        expect(result.p90).toBeLessThanOrEqual(10000);
        // Mean is weighted average of midpoints
        expect(result.mean).toBeGreaterThan(0);
      });

      it('calculates mean correctly', () => {
        const buckets = new Map<string, number>([
          ['agent_builder_query_to_result_time_<1s', 100], // midpoint 500
        ]);

        const result = queryUtils.calculatePercentilesFromBuckets(buckets, 'agent_builder');

        // Mean for single bucket should be midpoint
        expect(result.mean).toBe(500);
      });

      it('calculates weighted mean for multiple buckets', () => {
        const buckets = new Map<string, number>([
          ['agent_builder_query_to_result_time_<1s', 50], // midpoint 500, weight 50
          ['agent_builder_query_to_result_time_1-5s', 50], // midpoint 3000, weight 50
        ]);

        const result = queryUtils.calculatePercentilesFromBuckets(buckets, 'agent_builder');

        // Mean should be (500*50 + 3000*50) / 100 = 1750
        expect(result.mean).toBe(1750);
      });

      it('handles only high duration buckets', () => {
        const buckets = new Map<string, number>([['agent_builder_query_to_result_time_30s+', 10]]);

        const result = queryUtils.calculatePercentilesFromBuckets(buckets, 'agent_builder');

        // All percentiles should be within 30s+ bucket
        expect(result.p50).toBeGreaterThanOrEqual(30000);
        expect(result.mean).toBe(60000); // midpoint of 30s+ bucket
      });

      it('uses default domain prefix when not specified', () => {
        const buckets = new Map<string, number>([['agent_builder_query_to_result_time_<1s', 100]]);

        // Call without second parameter - should use 'agentBuilder' as default
        const result = queryUtils.calculatePercentilesFromBuckets(buckets);

        expect(result.p50).toBe(500);
        expect(result.mean).toBe(500);
      });
    });
  });
});
