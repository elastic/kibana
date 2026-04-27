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

    describe('getSkillsMetrics', () => {
      it('returns total, custom, and plugin counts from ES', async () => {
        esClient.search.mockResolvedValue({
          took: 1,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: {
            total: { value: 42, relation: 'eq' },
            hits: [],
          },
          aggregations: {
            custom: { doc_count: 30 },
            plugin: { doc_count: 12 },
          },
        });

        const result = await queryUtils.getSkillsMetrics();

        expect(result).toEqual({
          total: 42,
          custom: 30,
          plugin: 12,
        });
      });

      it('handles hits.total as a number', async () => {
        esClient.search.mockResolvedValue({
          took: 1,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: 7, hits: [] },
          aggregations: {
            custom: { doc_count: 5 },
            plugin: { doc_count: 2 },
          },
        });

        const result = await queryUtils.getSkillsMetrics();

        expect(result.total).toBe(7);
        expect(result.custom).toBe(5);
        expect(result.plugin).toBe(2);
      });

      it('queries the skills index with track_total_hits and filter aggs', async () => {
        esClient.search.mockResolvedValue({
          took: 1,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 0, relation: 'eq' }, hits: [] },
          aggregations: {
            custom: { doc_count: 0 },
            plugin: { doc_count: 0 },
          },
        });

        await queryUtils.getSkillsMetrics();

        expect(esClient.search).toHaveBeenCalledWith({
          index: '.chat-skills',
          size: 0,
          track_total_hits: true,
          aggs: {
            custom: {
              filter: {
                bool: {
                  must_not: { exists: { field: 'plugin_id' } },
                },
              },
            },
            plugin: {
              filter: {
                exists: { field: 'plugin_id' },
              },
            },
          },
        });
      });

      it('defaults custom and plugin to 0 when aggregations are missing', async () => {
        esClient.search.mockResolvedValue({
          took: 1,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 0, relation: 'eq' }, hits: [] },
          aggregations: {},
        });

        const result = await queryUtils.getSkillsMetrics();

        expect(result.custom).toBe(0);
        expect(result.plugin).toBe(0);
      });

      it('returns zeros on index_not_found_exception', async () => {
        const error = {
          message: 'index_not_found_exception: no such index [.chat-skills]',
        };
        esClient.search.mockRejectedValue(error);

        const result = await queryUtils.getSkillsMetrics();

        expect(result).toEqual({
          total: 0,
          custom: 0,
          plugin: 0,
        });
        expect(logger.warn).not.toHaveBeenCalled();
      });

      it('logs warning and returns zeros on other errors', async () => {
        esClient.search.mockRejectedValue(new Error('ES error'));

        const result = await queryUtils.getSkillsMetrics();

        expect(result).toEqual({
          total: 0,
          custom: 0,
          plugin: 0,
        });
        expect(logger.warn).toHaveBeenCalledWith('Failed to fetch skills metrics: ES error');
      });
    });

    describe('getPluginsCount', () => {
      it('returns plugins count from ES', async () => {
        esClient.count.mockResolvedValue({
          count: 9,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        });

        const result = await queryUtils.getPluginsCount();

        expect(result).toBe(9);
        expect(esClient.count).toHaveBeenCalledWith({ index: '.chat-plugins' });
      });

      it('returns 0 when count is undefined', async () => {
        esClient.count.mockResolvedValue({
          count: undefined as any,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        });

        const result = await queryUtils.getPluginsCount();

        expect(result).toBe(0);
      });

      it('returns 0 and does not log warning for index_not_found_exception', async () => {
        const error = {
          message: 'index_not_found_exception: no such index [.chat-plugins]',
        };
        esClient.count.mockRejectedValue(error);

        const result = await queryUtils.getPluginsCount();

        expect(result).toBe(0);
        expect(logger.warn).not.toHaveBeenCalled();
      });

      it('returns 0 and logs warning on other errors', async () => {
        esClient.count.mockRejectedValue(new Error('ES error'));

        const result = await queryUtils.getPluginsCount();

        expect(result).toBe(0);
        expect(logger.warn).toHaveBeenCalledWith('Failed to fetch plugins count: ES error');
      });
    });

    describe('getConversationMetrics', () => {
      const mockConversationResponse = ({
        totalHits = 100,
        roundsBuckets = [
          { key: '1-5', doc_count: 60 },
          { key: '6-10', doc_count: 25 },
          { key: '11-20', doc_count: 10 },
          { key: '21-50', doc_count: 4 },
          { key: '51+', doc_count: 1 },
        ],
        totalRounds = 745,
        inputTokens = 30000,
        outputTokens = 20000,
      } = {}) => ({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: totalHits, relation: 'eq' as const }, hits: [] },
        aggregations: {
          rounds_distribution: { buckets: roundsBuckets },
          total_rounds: { value: totalRounds },
          total_input_tokens: { value: inputTokens },
          total_output_tokens: { value: outputTokens },
        },
      });

      it('returns conversation metrics with real round counts', async () => {
        esClient.search.mockResolvedValue(mockConversationResponse());

        const result = await queryUtils.getConversationMetrics();

        expect(result).toEqual({
          total: 100,
          total_rounds: 745,
          avg_rounds_per_conversation: 7.45,
          rounds_distribution: [
            { bucket: '1-5', count: 60 },
            { bucket: '6-10', count: 25 },
            { bucket: '11-20', count: 10 },
            { bucket: '21-50', count: 4 },
            { bucket: '51+', count: 1 },
          ],
          tokens_used: 50000,
          tokens_input: 30000,
          tokens_output: 20000,
          average_tokens_per_conversation: 500,
        });
      });

      it('handles total as number (not object)', async () => {
        esClient.search.mockResolvedValue({
          ...mockConversationResponse({ totalHits: 50 }),
          hits: { total: 50, hits: [] },
        });

        const result = await queryUtils.getConversationMetrics();

        expect(result.total).toBe(50);
      });

      it('returns 0 for average when no conversations', async () => {
        esClient.search.mockResolvedValue(
          mockConversationResponse({
            totalHits: 0,
            roundsBuckets: [],
            totalRounds: 0,
            inputTokens: 0,
            outputTokens: 0,
          })
        );

        const result = await queryUtils.getConversationMetrics();

        expect(result).toEqual({
          total: 0,
          total_rounds: 0,
          avg_rounds_per_conversation: 0,
          rounds_distribution: [],
          tokens_used: 0,
          tokens_input: 0,
          tokens_output: 0,
          average_tokens_per_conversation: 0,
        });
      });

      it('applies date filter when provided', async () => {
        esClient.search.mockResolvedValue(
          mockConversationResponse({
            totalHits: 10,
            totalRounds: 25,
            inputTokens: 1000,
            outputTokens: 500,
          })
        );

        await queryUtils.getConversationMetrics({ gte: '2024-01-01T00:00:00.000Z' });

        expect(esClient.search).toHaveBeenCalledWith(
          expect.objectContaining({
            query: {
              bool: {
                filter: [{ range: { created_at: { gte: '2024-01-01T00:00:00.000Z' } } }],
              },
            },
          })
        );
      });

      it('uses match_all when no date filter', async () => {
        esClient.search.mockResolvedValue(mockConversationResponse());

        await queryUtils.getConversationMetrics();

        expect(esClient.search).toHaveBeenCalledWith(
          expect.objectContaining({
            query: { match_all: {} },
          })
        );
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
          tokens_input: 0,
          tokens_output: 0,
          average_tokens_per_conversation: 0,
        });
        expect(logger.warn).toHaveBeenCalledWith('Failed to fetch conversation metrics: ES error');
      });
    });

    describe('getAllRoundMetrics', () => {
      const mockRoundMetricsResponse = ({
        ttft = { p50: 100, p75: 200, p90: 400, p95: 600, p99: 800, mean: 150.0, total_samples: 5 },
        ttlt = {
          p50: 1000,
          p75: 2000,
          p90: 4000,
          p95: 6000,
          p99: 8000,
          mean: 1500.0,
          total_samples: 10,
        },
        byModel = [
          {
            model: 'gpt-4',
            ttlt_p50: 900,
            ttlt_p75: 1200,
            ttlt_p90: 1500,
            ttlt_p95: 2000,
            ttlt_p99: 2500,
            ttlt_mean: 1100.0,
            ttlt_samples: 6,
            input_tokens: 10000,
            output_tokens: 8000,
            total_tokens: 18000,
            rounds: 6,
            avg_tokens_per_round: 3000.0,
            tool_calls: 4,
          },
        ],
        byAgent = [
          {
            agent_id: 'default',
            p50: 1000,
            p75: 2000,
            p90: 4000,
            p95: 6000,
            p99: 8000,
            mean: 1500.0,
            total_samples: 10,
          },
        ],
      } = {}) => ({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' as const }, hits: [] },
        aggregations: {
          round_metrics: {
            value: { ttft, ttlt, byModel, byAgent },
          },
        },
      });

      it('returns populated round metrics from scripted_metric aggregation', async () => {
        esClient.search.mockResolvedValue(mockRoundMetricsResponse());

        const result = await queryUtils.getAllRoundMetrics();

        expect(result.ttft).toEqual({
          p50: 100,
          p75: 200,
          p90: 400,
          p95: 600,
          p99: 800,
          mean: 150,
          total_samples: 5,
        });
        expect(result.ttlt).toEqual({
          p50: 1000,
          p75: 2000,
          p90: 4000,
          p95: 6000,
          p99: 8000,
          mean: 1500,
          total_samples: 10,
        });
        expect(result.byModel).toEqual([
          {
            model: 'gpt-4',
            ttlt_p50: 900,
            ttlt_p75: 1200,
            ttlt_p90: 1500,
            ttlt_p95: 2000,
            ttlt_p99: 2500,
            ttlt_mean: 1100,
            ttlt_samples: 6,
            input_tokens: 10000,
            output_tokens: 8000,
            total_tokens: 18000,
            rounds: 6,
            avg_tokens_per_round: 3000,
            tool_calls: 4,
          },
        ]);
        expect(result.byAgent).toEqual([
          {
            agent_id: 'default',
            p50: 1000,
            p75: 2000,
            p90: 4000,
            p95: 6000,
            p99: 8000,
            mean: 1500,
            total_samples: 10,
          },
        ]);
      });

      it('returns empty defaults when aggregation value is null', async () => {
        esClient.search.mockResolvedValue({
          took: 1,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 0, relation: 'eq' as const }, hits: [] },
          aggregations: {
            round_metrics: { value: null },
          },
        });

        const result = await queryUtils.getAllRoundMetrics();

        expect(result.ttft).toEqual({
          p50: 0,
          p75: 0,
          p90: 0,
          p95: 0,
          p99: 0,
          mean: 0,
          total_samples: 0,
        });
        expect(result.ttlt).toEqual({
          p50: 0,
          p75: 0,
          p90: 0,
          p95: 0,
          p99: 0,
          mean: 0,
          total_samples: 0,
        });
        expect(result.byModel).toEqual([]);
        expect(result.byAgent).toEqual([]);
      });

      it('returns empty defaults when aggregation is missing entirely', async () => {
        esClient.search.mockResolvedValue({
          took: 1,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 0, relation: 'eq' as const }, hits: [] },
          aggregations: {},
        });

        const result = await queryUtils.getAllRoundMetrics();

        expect(result.byModel).toEqual([]);
        expect(result.byAgent).toEqual([]);
      });

      it('returns empty defaults for index_not_found_exception without logging', async () => {
        const error = {
          message: 'index_not_found_exception: no such index [.chat-conversations]',
        };
        esClient.search.mockRejectedValue(error);

        const result = await queryUtils.getAllRoundMetrics();

        expect(result.ttft).toEqual({
          p50: 0,
          p75: 0,
          p90: 0,
          p95: 0,
          p99: 0,
          mean: 0,
          total_samples: 0,
        });
        expect(result.byModel).toEqual([]);
        expect(result.byAgent).toEqual([]);
        expect(logger.warn).not.toHaveBeenCalled();
      });

      it('returns empty defaults and logs warning for other errors', async () => {
        esClient.search.mockRejectedValue(new Error('ES error'));

        const result = await queryUtils.getAllRoundMetrics();

        expect(result.ttft.total_samples).toBe(0);
        expect(result.byModel).toEqual([]);
        expect(logger.warn).toHaveBeenCalledWith('Failed to fetch round metrics: ES error');
      });

      it('passes dateFilter to the ES query', async () => {
        esClient.search.mockResolvedValue(mockRoundMetricsResponse());

        await queryUtils.getAllRoundMetrics({ gte: '2024-01-01T00:00:00.000Z' });

        expect(esClient.search).toHaveBeenCalledWith(
          expect.objectContaining({
            query: {
              bool: {
                filter: [{ range: { created_at: { gte: '2024-01-01T00:00:00.000Z' } } }],
              },
            },
          })
        );
      });

      it('uses match_all when no dateFilter is provided', async () => {
        esClient.search.mockResolvedValue(mockRoundMetricsResponse());

        await queryUtils.getAllRoundMetrics();

        expect(esClient.search).toHaveBeenCalledWith(
          expect.objectContaining({
            query: { match_all: {} },
          })
        );
      });

      it('handles multiple models and agents', async () => {
        esClient.search.mockResolvedValue(
          mockRoundMetricsResponse({
            byModel: [
              {
                model: 'gpt-4',
                ttlt_p50: 900,
                ttlt_p75: 1200,
                ttlt_p90: 1500,
                ttlt_p95: 2000,
                ttlt_p99: 2500,
                ttlt_mean: 1100.0,
                ttlt_samples: 6,
                input_tokens: 10000,
                output_tokens: 8000,
                total_tokens: 18000,
                rounds: 6,
                avg_tokens_per_round: 3000.0,
                tool_calls: 4,
              },
              {
                model: 'claude-3',
                ttlt_p50: 800,
                ttlt_p75: 1100,
                ttlt_p90: 1400,
                ttlt_p95: 1800,
                ttlt_p99: 2200,
                ttlt_mean: 1000.0,
                ttlt_samples: 4,
                input_tokens: 5000,
                output_tokens: 4000,
                total_tokens: 9000,
                rounds: 4,
                avg_tokens_per_round: 2250.0,
                tool_calls: 0,
              },
            ],
            byAgent: [
              {
                agent_id: 'default',
                p50: 1000,
                p75: 2000,
                p90: 4000,
                p95: 6000,
                p99: 8000,
                mean: 1500.0,
                total_samples: 6,
              },
              {
                agent_id: 'custom_agent_1',
                p50: 800,
                p75: 1500,
                p90: 3000,
                p95: 5000,
                p99: 7000,
                mean: 1200.0,
                total_samples: 4,
              },
            ],
          })
        );

        const result = await queryUtils.getAllRoundMetrics();

        expect(result.byModel).toHaveLength(2);
        expect(result.byModel[0].model).toBe('gpt-4');
        expect(result.byModel[1].model).toBe('claude-3');
        expect(result.byAgent).toHaveLength(2);
        expect(result.byAgent[0].agent_id).toBe('default');
        expect(result.byAgent[1].agent_id).toBe('custom_agent_1');
      });

      it('rounds fractional percentile values', async () => {
        esClient.search.mockResolvedValue(
          mockRoundMetricsResponse({
            ttft: {
              p50: 100.7,
              p75: 200.3,
              p90: 400.9,
              p95: 600.1,
              p99: 800.5,
              mean: 150.456,
              total_samples: 5,
            },
          })
        );

        const result = await queryUtils.getAllRoundMetrics();

        expect(result.ttft).toEqual({
          p50: 101,
          p75: 200,
          p90: 401,
          p95: 600,
          p99: 801,
          mean: 150,
          total_samples: 5,
        });
      });

      it('defaults missing model fields to zero', async () => {
        esClient.search.mockResolvedValue(
          mockRoundMetricsResponse({
            byModel: [{ model: 'unknown-model' } as any],
          })
        );

        const result = await queryUtils.getAllRoundMetrics();

        expect(result.byModel[0]).toEqual({
          model: 'unknown-model',
          ttlt_p50: 0,
          ttlt_p75: 0,
          ttlt_p90: 0,
          ttlt_p95: 0,
          ttlt_p99: 0,
          ttlt_mean: 0,
          ttlt_samples: 0,
          input_tokens: 0,
          output_tokens: 0,
          total_tokens: 0,
          rounds: 0,
          avg_tokens_per_round: 0,
          tool_calls: 0,
        });
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
