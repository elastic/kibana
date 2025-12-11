/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { OnechatTelemetry } from './telemetry_collector';
import { registerTelemetryCollector } from './telemetry_collector';
import { ONECHAT_USAGE_DOMAIN } from './usage_counters';

// Mock the QueryUtils class
jest.mock('./query_utils', () => ({
  QueryUtils: jest.fn().mockImplementation(() => ({
    getCustomToolsMetrics: jest.fn(),
    getCustomAgentsMetrics: jest.fn(),
    getConversationMetrics: jest.fn(),
    getCountersByPrefix: jest.fn(),
    calculatePercentilesFromBuckets: jest.fn(),
    getTTFTMetrics: jest.fn(),
    getTTLTMetrics: jest.fn(),
    getLatencyByModel: jest.fn(),
    getLatencyByAgentType: jest.fn(),
  })),
  isIndexNotFoundError: jest.fn(),
}));

describe('telemetry_collector', () => {
  let mockUsageCollection: jest.Mocked<UsageCollectionSetup>;
  let logger: MockedLogger;
  let registeredCollector: any;

  beforeEach(() => {
    registeredCollector = null;

    mockUsageCollection = {
      makeUsageCollector: jest.fn().mockImplementation((config) => {
        registeredCollector = config;
        return config;
      }),
      registerCollector: jest.fn(),
    } as unknown as jest.Mocked<UsageCollectionSetup>;

    logger = loggerMock.create();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerTelemetryCollector', () => {
    it('does not register collector when usageCollection is undefined', () => {
      registerTelemetryCollector(undefined, logger);

      expect(logger.debug).toHaveBeenCalledWith(
        'Usage collection not available, skipping telemetry collector registration'
      );
    });

    it('registers collector with correct type', () => {
      registerTelemetryCollector(mockUsageCollection, logger);

      expect(mockUsageCollection.makeUsageCollector).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'agent_builder',
        })
      );
    });

    it('collector isReady returns true', () => {
      registerTelemetryCollector(mockUsageCollection, logger);

      expect(registeredCollector.isReady()).toBe(true);
    });

    it('logs info message on successful registration', () => {
      registerTelemetryCollector(mockUsageCollection, logger);

      expect(logger.info).toHaveBeenCalledWith('Registered telemetry collector for agent_builder');
    });

    it('registers collector with usageCollection', () => {
      registerTelemetryCollector(mockUsageCollection, logger);

      expect(mockUsageCollection.registerCollector).toHaveBeenCalledWith(registeredCollector);
    });
  });

  describe('schema definition', () => {
    beforeEach(() => {
      registerTelemetryCollector(mockUsageCollection, logger);
    });

    it('defines custom_tools schema', () => {
      expect(registeredCollector.schema.custom_tools).toBeDefined();
      expect(registeredCollector.schema.custom_tools.total.type).toBe('long');
      expect(registeredCollector.schema.custom_tools.by_type.type).toBe('array');
    });

    it('defines custom_agents schema', () => {
      expect(registeredCollector.schema.custom_agents).toBeDefined();
      expect(registeredCollector.schema.custom_agents.total.type).toBe('long');
    });

    it('defines conversations schema', () => {
      expect(registeredCollector.schema.conversations).toBeDefined();
      expect(registeredCollector.schema.conversations.total.type).toBe('long');
      expect(registeredCollector.schema.conversations.total_rounds.type).toBe('long');
      expect(registeredCollector.schema.conversations.avg_rounds_per_conversation.type).toBe(
        'float'
      );
      expect(registeredCollector.schema.conversations.rounds_distribution.type).toBe('array');
      expect(registeredCollector.schema.conversations.tokens_used.type).toBe('long');
      expect(registeredCollector.schema.conversations.average_tokens_per_conversation.type).toBe(
        'float'
      );
    });

    it('defines query_to_result_time schema', () => {
      expect(registeredCollector.schema.query_to_result_time).toBeDefined();
      expect(registeredCollector.schema.query_to_result_time.p50.type).toBe('long');
      expect(registeredCollector.schema.query_to_result_time.p75.type).toBe('long');
      expect(registeredCollector.schema.query_to_result_time.p90.type).toBe('long');
      expect(registeredCollector.schema.query_to_result_time.p95.type).toBe('long');
      expect(registeredCollector.schema.query_to_result_time.p99.type).toBe('long');
      expect(registeredCollector.schema.query_to_result_time.mean.type).toBe('long');
    });

    it('defines tool_calls schema', () => {
      expect(registeredCollector.schema.tool_calls).toBeDefined();
      expect(registeredCollector.schema.tool_calls.total.type).toBe('long');
      expect(registeredCollector.schema.tool_calls.by_source.default_agent.type).toBe('long');
      expect(registeredCollector.schema.tool_calls.by_source.custom_agent.type).toBe('long');
      expect(registeredCollector.schema.tool_calls.by_source.mcp.type).toBe('long');
      expect(registeredCollector.schema.tool_calls.by_source.api.type).toBe('long');
      expect(registeredCollector.schema.tool_calls.by_source.a2a.type).toBe('long');
    });

    it('defines llm_usage schema', () => {
      expect(registeredCollector.schema.llm_usage).toBeDefined();
      expect(registeredCollector.schema.llm_usage.by_provider.type).toBe('array');
      expect(registeredCollector.schema.llm_usage.by_model.type).toBe('array');
    });

    it('defines errors schema', () => {
      expect(registeredCollector.schema.errors).toBeDefined();
      expect(registeredCollector.schema.errors.total.type).toBe('long');
      expect(registeredCollector.schema.errors.avg_errors_per_conversation.type).toBe('float');
      expect(registeredCollector.schema.errors.total_conversations_with_errors.type).toBe('long');
      expect(registeredCollector.schema.errors.by_type.type).toBe('array');
    });
  });

  describe('fetch function', () => {
    let mockContext: any;
    let mockQueryUtils: any;

    beforeEach(() => {
      // Reset the mock for QueryUtils - using require since jest.mock hoists
      const { QueryUtils } = jest.requireMock('./query_utils');
      mockQueryUtils = {
        getCustomToolsMetrics: jest.fn().mockResolvedValue({
          total: 10,
          by_type: [
            { type: 'esql', count: 5 },
            { type: 'workflow', count: 5 },
          ],
        }),
        getCustomAgentsMetrics: jest.fn().mockResolvedValue(3),
        getConversationMetrics: jest.fn().mockResolvedValue({
          total: 100,
          total_rounds: 500,
          avg_rounds_per_conversation: 5,
          rounds_distribution: [{ bucket: '1-5', count: 100 }],
          tokens_used: 50000,
          average_tokens_per_conversation: 500,
        }),
        getTTFTMetrics: jest.fn().mockResolvedValue({
          p50: 100,
          p75: 200,
          p90: 400,
          p95: 600,
          p99: 800,
          mean: 150,
          total_samples: 1000,
        }),
        getTTLTMetrics: jest.fn().mockResolvedValue({
          p50: 1000,
          p75: 2000,
          p90: 4000,
          p95: 6000,
          p99: 8000,
          mean: 1500,
          total_samples: 1000,
        }),
        getLatencyByModel: jest.fn().mockResolvedValue([
          {
            model: 'gpt-4',
            ttft_p50: 100,
            ttft_p95: 500,
            ttlt_p50: 1000,
            ttlt_p95: 5000,
            sample_count: 500,
          },
        ]),
        getLatencyByAgentType: jest.fn().mockResolvedValue([
          {
            agent_id: 'default',
            ttft_p50: 120,
            ttft_p95: 550,
            ttlt_p50: 1100,
            ttlt_p95: 5500,
            sample_count: 300,
          },
        ]),
        getCountersByPrefix: jest.fn().mockImplementation((domain, prefix) => {
          if (prefix === `${ONECHAT_USAGE_DOMAIN}_query_to_result_time_`) {
            return Promise.resolve(
              new Map([
                [`${ONECHAT_USAGE_DOMAIN}_query_to_result_time_<1s`, 50],
                [`${ONECHAT_USAGE_DOMAIN}_query_to_result_time_1-5s`, 30],
              ])
            );
          }
          if (prefix === `${ONECHAT_USAGE_DOMAIN}_tool_call_`) {
            return Promise.resolve(
              new Map([
                [`${ONECHAT_USAGE_DOMAIN}_tool_call_default_agent`, 100],
                [`${ONECHAT_USAGE_DOMAIN}_tool_call_custom_agent`, 50],
                [`${ONECHAT_USAGE_DOMAIN}_tool_call_mcp`, 25],
                [`${ONECHAT_USAGE_DOMAIN}_tool_call_api`, 10],
                [`${ONECHAT_USAGE_DOMAIN}_tool_call_a2a`, 5],
              ])
            );
          }
          if (prefix === `${ONECHAT_USAGE_DOMAIN}_llm_provider_`) {
            return Promise.resolve(
              new Map([
                [`${ONECHAT_USAGE_DOMAIN}_llm_provider_openai`, 80],
                [`${ONECHAT_USAGE_DOMAIN}_llm_provider_bedrock`, 20],
              ])
            );
          }
          if (prefix === `${ONECHAT_USAGE_DOMAIN}_llm_model_`) {
            return Promise.resolve(
              new Map([
                [`${ONECHAT_USAGE_DOMAIN}_llm_model_gpt-4`, 60],
                [`${ONECHAT_USAGE_DOMAIN}_llm_model_claude-3`, 40],
              ])
            );
          }
          if (prefix === `${ONECHAT_USAGE_DOMAIN}_error_`) {
            return Promise.resolve(
              new Map([
                [`${ONECHAT_USAGE_DOMAIN}_error_total`, 15],
                [`${ONECHAT_USAGE_DOMAIN}_error_conversations_with_errors`, 10],
                [`${ONECHAT_USAGE_DOMAIN}_error_by_type_badRequest`, 8],
                [`${ONECHAT_USAGE_DOMAIN}_error_by_type_internalError`, 7],
              ])
            );
          }
          return Promise.resolve(new Map());
        }),
        calculatePercentilesFromBuckets: jest.fn().mockReturnValue({
          p50: 500,
          p75: 2000,
          p90: 4000,
          p95: 6000,
          p99: 8000,
          mean: 1500,
        }),
      };
      QueryUtils.mockImplementation(() => mockQueryUtils);

      mockContext = {
        esClient: {},
        soClient: {},
      };

      registerTelemetryCollector(mockUsageCollection, logger);
    });

    it('fetches and returns telemetry data', async () => {
      const result: OnechatTelemetry = await registeredCollector.fetch(mockContext);

      expect(result.custom_tools).toEqual({
        total: 10,
        by_type: [
          { type: 'esql', count: 5 },
          { type: 'workflow', count: 5 },
        ],
      });

      expect(result.custom_agents).toEqual({ total: 3 });

      expect(result.conversations).toEqual({
        total: 100,
        total_rounds: 500,
        avg_rounds_per_conversation: 5,
        rounds_distribution: [{ bucket: '1-5', count: 100 }],
        tokens_used: 50000,
        average_tokens_per_conversation: 500,
      });

      expect(result.query_to_result_time).toEqual({
        p50: 500,
        p75: 2000,
        p90: 4000,
        p95: 6000,
        p99: 8000,
        mean: 1500,
      });

      expect(result.tool_calls).toEqual({
        total: 190, // 100 + 50 + 25 + 10 + 5
        by_source: {
          default_agent: 100,
          custom_agent: 50,
          mcp: 25,
          api: 10,
          a2a: 5,
        },
      });

      expect(result.llm_usage.by_provider).toEqual([
        { provider: 'openai', count: 80 },
        { provider: 'bedrock', count: 20 },
      ]);

      expect(result.llm_usage.by_model).toEqual([
        { model: 'gpt-4', count: 60 },
        { model: 'claude-3', count: 40 },
      ]);

      expect(result.errors).toEqual({
        total: 15,
        avg_errors_per_conversation: 1.5,
        total_conversations_with_errors: 10,
        by_type: [
          { type: 'badRequest', count: 8 },
          { type: 'internalError', count: 7 },
        ],
      });
    });

    it('returns default values when fetch throws error', async () => {
      mockQueryUtils.getCustomToolsMetrics.mockRejectedValue(new Error('Fetch error'));

      const result: OnechatTelemetry = await registeredCollector.fetch(mockContext);

      expect(logger.error).toHaveBeenCalledWith('Failed to collect telemetry: Fetch error');

      expect(result).toEqual({
        custom_tools: { total: 0, by_type: [] },
        custom_agents: { total: 0 },
        conversations: {
          total: 0,
          total_rounds: 0,
          avg_rounds_per_conversation: 0,
          rounds_distribution: [],
          tokens_used: 0,
          average_tokens_per_conversation: 0,
        },
        query_to_result_time: {
          p50: 0,
          p75: 0,
          p90: 0,
          p95: 0,
          p99: 0,
          mean: 0,
        },
        time_to_first_token: {
          p50: 0,
          p75: 0,
          p90: 0,
          p95: 0,
          p99: 0,
          mean: 0,
          total_samples: 0,
        },
        time_to_last_token: {
          p50: 0,
          p75: 0,
          p90: 0,
          p95: 0,
          p99: 0,
          mean: 0,
          total_samples: 0,
        },
        latency_by_model: [],
        latency_by_agent_type: [],
        tool_calls: {
          total: 0,
          by_source: {
            default_agent: 0,
            custom_agent: 0,
            mcp: 0,
            api: 0,
            a2a: 0,
          },
        },
        llm_usage: {
          by_provider: [],
          by_model: [],
        },
        errors: {
          total: 0,
          avg_errors_per_conversation: 0,
          total_conversations_with_errors: 0,
          by_type: [],
        },
      });
    });

    it('filters out zero-count LLM providers', async () => {
      mockQueryUtils.getCountersByPrefix.mockImplementation((domain: string, prefix: string) => {
        if (prefix === `${ONECHAT_USAGE_DOMAIN}_llm_provider_`) {
          return Promise.resolve(
            new Map([
              [`${ONECHAT_USAGE_DOMAIN}_llm_provider_openai`, 80],
              [`${ONECHAT_USAGE_DOMAIN}_llm_provider_unused`, 0],
            ])
          );
        }
        if (prefix === `${ONECHAT_USAGE_DOMAIN}_llm_model_`) {
          return Promise.resolve(new Map());
        }
        return Promise.resolve(new Map());
      });

      const result: OnechatTelemetry = await registeredCollector.fetch(mockContext);

      expect(result.llm_usage.by_provider).toEqual([{ provider: 'openai', count: 80 }]);
    });

    it('sorts LLM providers by count descending', async () => {
      mockQueryUtils.getCountersByPrefix.mockImplementation((domain: string, prefix: string) => {
        if (prefix === `${ONECHAT_USAGE_DOMAIN}_llm_provider_`) {
          return Promise.resolve(
            new Map([
              [`${ONECHAT_USAGE_DOMAIN}_llm_provider_least`, 10],
              [`${ONECHAT_USAGE_DOMAIN}_llm_provider_most`, 100],
              [`${ONECHAT_USAGE_DOMAIN}_llm_provider_middle`, 50],
            ])
          );
        }
        if (prefix === `${ONECHAT_USAGE_DOMAIN}_llm_model_`) {
          return Promise.resolve(new Map());
        }
        return Promise.resolve(new Map());
      });

      const result: OnechatTelemetry = await registeredCollector.fetch(mockContext);

      expect(result.llm_usage.by_provider).toEqual([
        { provider: 'most', count: 100 },
        { provider: 'middle', count: 50 },
        { provider: 'least', count: 10 },
      ]);
    });

    it('sorts error types by count descending', async () => {
      mockQueryUtils.getCountersByPrefix.mockImplementation((domain: string, prefix: string) => {
        if (prefix === `${ONECHAT_USAGE_DOMAIN}_error_`) {
          return Promise.resolve(
            new Map([
              [`${ONECHAT_USAGE_DOMAIN}_error_total`, 30],
              [`${ONECHAT_USAGE_DOMAIN}_error_conversations_with_errors`, 20],
              [`${ONECHAT_USAGE_DOMAIN}_error_by_type_least`, 5],
              [`${ONECHAT_USAGE_DOMAIN}_error_by_type_most`, 20],
              [`${ONECHAT_USAGE_DOMAIN}_error_by_type_middle`, 10],
            ])
          );
        }
        return Promise.resolve(new Map());
      });

      const result: OnechatTelemetry = await registeredCollector.fetch(mockContext);

      expect(result.errors.by_type).toEqual([
        { type: 'most', count: 20 },
        { type: 'middle', count: 10 },
        { type: 'least', count: 5 },
      ]);
    });

    it('calculates avg_errors_per_conversation correctly', async () => {
      mockQueryUtils.getCountersByPrefix.mockImplementation((domain: string, prefix: string) => {
        if (prefix === `${ONECHAT_USAGE_DOMAIN}_error_`) {
          return Promise.resolve(
            new Map([
              [`${ONECHAT_USAGE_DOMAIN}_error_total`, 30],
              [`${ONECHAT_USAGE_DOMAIN}_error_conversations_with_errors`, 10],
            ])
          );
        }
        return Promise.resolve(new Map());
      });

      const result: OnechatTelemetry = await registeredCollector.fetch(mockContext);

      expect(result.errors.avg_errors_per_conversation).toBe(3); // 30 / 10
    });

    it('returns 0 for avg_errors_per_conversation when no conversations have errors', async () => {
      mockQueryUtils.getCountersByPrefix.mockImplementation((domain: string, prefix: string) => {
        if (prefix === `${ONECHAT_USAGE_DOMAIN}_error_`) {
          return Promise.resolve(
            new Map([
              [`${ONECHAT_USAGE_DOMAIN}_error_total`, 0],
              [`${ONECHAT_USAGE_DOMAIN}_error_conversations_with_errors`, 0],
            ])
          );
        }
        return Promise.resolve(new Map());
      });

      const result: OnechatTelemetry = await registeredCollector.fetch(mockContext);

      expect(result.errors.avg_errors_per_conversation).toBe(0);
    });

    it('handles missing tool_call counters with default 0', async () => {
      mockQueryUtils.getCountersByPrefix.mockImplementation((domain: string, prefix: string) => {
        if (prefix === `${ONECHAT_USAGE_DOMAIN}_tool_call_`) {
          return Promise.resolve(
            new Map([
              [`${ONECHAT_USAGE_DOMAIN}_tool_call_default_agent`, 10],
              // Missing other sources
            ])
          );
        }
        return Promise.resolve(new Map());
      });

      const result: OnechatTelemetry = await registeredCollector.fetch(mockContext);

      expect(result.tool_calls.by_source).toEqual({
        default_agent: 10,
        custom_agent: 0,
        mcp: 0,
        api: 0,
        a2a: 0,
      });
      expect(result.tool_calls.total).toBe(10);
    });
  });
});
