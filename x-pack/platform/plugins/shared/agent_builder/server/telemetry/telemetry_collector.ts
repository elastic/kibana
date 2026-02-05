/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CollectorFetchContext,
  UsageCollectionSetup,
} from '@kbn/usage-collection-plugin/server';
import type { Logger } from '@kbn/logging';
import { QueryUtils } from './query_utils';
import { AGENTBUILDER_USAGE_DOMAIN } from './usage_counters';

/**
 * Timing percentile metrics structure
 */
interface TimingPercentiles {
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  mean: number;
  total_samples: number;
}

/**
 * Telemetry payload schema for Agent Builder
 */
export interface AgentBuilderTelemetry {
  custom_tools: {
    total: number;
    by_type: Array<{
      type: string;
      count: number;
    }>;
  };
  custom_agents: {
    total: number;
  };
  conversations: {
    total: number;
    total_rounds: number;
    avg_rounds_per_conversation: number;
    rounds_distribution: Array<{
      bucket: string;
      count: number;
    }>;
    tokens_used: number;
    average_tokens_per_conversation: number;
  };
  query_to_result_time: {
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
    mean: number;
  };
  time_to_first_token: TimingPercentiles;
  /**
   * Token consumption grouped by model
   */
  tokens_by_model: Array<{
    model: string;
    total_tokens: number;
    avg_tokens_per_round: number;
    sample_count: number;
  }>;
  /**
   * Query-to-result timing (proxied by TTLT) grouped by model
   */
  query_to_result_time_by_model: Array<
    {
      model: string;
      sample_count: number;
    } & TimingPercentiles
  >;
  /**
   * Query-to-result timing (proxied by TTLT) grouped by agent
   */
  query_to_result_time_by_agent_type: Array<
    {
      agent_id: string;
      sample_count: number;
    } & TimingPercentiles
  >;
  /**
   * Tool calls grouped by model (derived from conversation round steps)
   */
  tool_calls_by_model: Array<{
    model: string;
    count: number;
  }>;
  tool_calls: {
    total: number;
    by_source: {
      default_agent: number;
      custom_agent: number;
      mcp: number;
      api: number;
      a2a: number;
    };
  };
  llm_usage: {
    by_provider: Array<{
      provider: string;
      count: number;
    }>;
    by_model: Array<{
      model: string;
      count: number;
    }>;
  };
  errors: {
    total: number;
    avg_errors_per_conversation: number;
    total_conversations_with_errors: number;
    by_type: Array<{ type: string; count: number }>;
  };
}

/**
 * Register telemetry collector for Agent Builder
 * @param usageCollection - Usage collection setup contract
 * @param logger - Logger instance
 */
export function registerTelemetryCollector(
  usageCollection: UsageCollectionSetup | undefined,
  logger: Logger
): void {
  if (!usageCollection) {
    logger.debug('Usage collection not available, skipping telemetry collector registration');
    return;
  }

  usageCollection.registerCollector(
    usageCollection.makeUsageCollector<AgentBuilderTelemetry>({
      type: 'agent_builder',
      isReady: () => true,
      schema: {
        custom_tools: {
          total: {
            type: 'long',
            _meta: {
              description: 'Total number of custom tools created by users',
            },
          },
          by_type: {
            type: 'array',
            items: {
              type: {
                type: 'keyword',
                _meta: {
                  description: 'Tool type (esql, index_search, workflow, builtin)',
                },
              },
              count: {
                type: 'long',
                _meta: {
                  description: 'Number of tools of this type',
                },
              },
            },
          },
        },
        custom_agents: {
          total: {
            type: 'long',
            _meta: {
              description: 'Total number of custom agents created by users',
            },
          },
        },
        conversations: {
          total: {
            type: 'long',
            _meta: {
              description: 'Total number of conversations',
            },
          },
          total_rounds: {
            type: 'long',
            _meta: {
              description: 'Total conversation rounds across all conversations',
            },
          },
          avg_rounds_per_conversation: {
            type: 'float',
            _meta: {
              description: 'Average rounds per conversation',
            },
          },
          rounds_distribution: {
            type: 'array',
            items: {
              bucket: {
                type: 'keyword',
                _meta: {
                  description: 'Round count bucket (1-5, 6-10, 11-20, 21-50, 51+)',
                },
              },
              count: {
                type: 'long',
                _meta: {
                  description: 'Number of conversations in this bucket',
                },
              },
            },
          },
          tokens_used: {
            type: 'long',
            _meta: {
              description: 'Total tokens used across all conversations (input + output)',
            },
          },
          average_tokens_per_conversation: {
            type: 'float',
            _meta: {
              description: 'Average tokens per conversation',
            },
          },
        },
        query_to_result_time: {
          p50: {
            type: 'long',
            _meta: {
              description: '50th percentile query-to-result time in milliseconds',
            },
          },
          p75: {
            type: 'long',
            _meta: {
              description: '75th percentile query-to-result time in milliseconds',
            },
          },
          p90: {
            type: 'long',
            _meta: {
              description: '90th percentile query-to-result time in milliseconds',
            },
          },
          p95: {
            type: 'long',
            _meta: {
              description: '95th percentile query-to-result time in milliseconds',
            },
          },
          p99: {
            type: 'long',
            _meta: {
              description: '99th percentile query-to-result time in milliseconds',
            },
          },
          mean: {
            type: 'long',
            _meta: {
              description: 'Mean query-to-result time in milliseconds',
            },
          },
        },
        time_to_first_token: {
          p50: {
            type: 'long',
            _meta: {
              description: '50th percentile time-to-first-token in milliseconds',
            },
          },
          p75: {
            type: 'long',
            _meta: {
              description: '75th percentile time-to-first-token in milliseconds',
            },
          },
          p90: {
            type: 'long',
            _meta: {
              description: '90th percentile time-to-first-token in milliseconds',
            },
          },
          p95: {
            type: 'long',
            _meta: {
              description: '95th percentile time-to-first-token in milliseconds',
            },
          },
          p99: {
            type: 'long',
            _meta: {
              description: '99th percentile time-to-first-token in milliseconds',
            },
          },
          mean: {
            type: 'long',
            _meta: {
              description: 'Mean time-to-first-token in milliseconds',
            },
          },
          total_samples: {
            type: 'long',
            _meta: {
              description: 'Total number of TTFT samples',
            },
          },
        },
        query_to_result_time_by_agent_type: {
          type: 'array',
          items: {
            agent_id: {
              type: 'keyword',
              _meta: {
                description: 'Agent ID',
              },
            },
            p50: { type: 'long' },
            p75: { type: 'long' },
            p90: { type: 'long' },
            p95: { type: 'long' },
            p99: { type: 'long' },
            mean: { type: 'long' },
            total_samples: { type: 'long' },
            sample_count: {
              type: 'long',
              _meta: {
                description: 'Number of samples for this agent',
              },
            },
          },
        },
        tokens_by_model: {
          type: 'array',
          items: {
            model: {
              type: 'keyword',
              _meta: {
                description: 'Model identifier for token usage grouping',
              },
            },
            total_tokens: {
              type: 'long',
              _meta: {
                description: 'Total tokens (input + output) consumed by this model',
              },
            },
            avg_tokens_per_round: {
              type: 'float',
              _meta: {
                description: 'Average tokens per conversation round for this model',
              },
            },
            sample_count: {
              type: 'long',
              _meta: {
                description: 'Number of rounds sampled for this model',
              },
            },
          },
        },
        query_to_result_time_by_model: {
          type: 'array',
          items: {
            model: {
              type: 'keyword',
              _meta: {
                description: 'Model identifier for QTRT grouping',
              },
            },
            p50: { type: 'long' },
            p75: { type: 'long' },
            p90: { type: 'long' },
            p95: { type: 'long' },
            p99: { type: 'long' },
            mean: { type: 'long' },
            total_samples: { type: 'long' },
            sample_count: { type: 'long' },
          },
        },
        tool_calls_by_model: {
          type: 'array',
          items: {
            model: {
              type: 'keyword',
              _meta: {
                description: 'Model identifier for tool-call grouping',
              },
            },
            count: {
              type: 'long',
              _meta: {
                description: 'Tool calls counted for this model',
              },
            },
          },
        },
        tool_calls: {
          total: {
            type: 'long',
            _meta: {
              description: 'Total tool calls across all sources',
            },
          },
          by_source: {
            default_agent: {
              type: 'long',
              _meta: {
                description: 'Tool calls from default agents',
              },
            },
            custom_agent: {
              type: 'long',
              _meta: {
                description: 'Tool calls from custom agents',
              },
            },
            mcp: {
              type: 'long',
              _meta: {
                description: 'Tool calls from MCP clients',
              },
            },
            api: {
              type: 'long',
              _meta: {
                description: 'Direct tool calls via API',
              },
            },
            a2a: {
              type: 'long',
              _meta: {
                description: 'Tool calls from agent-to-agent communication',
              },
            },
          },
        },
        llm_usage: {
          by_provider: {
            type: 'array',
            items: {
              provider: {
                type: 'keyword',
                _meta: {
                  description: 'LLM provider name (e.g., openai, bedrock)',
                },
              },
              count: {
                type: 'long',
                _meta: {
                  description: 'Number of LLM invocations for this provider',
                },
              },
            },
          },
          by_model: {
            type: 'array',
            items: {
              model: {
                type: 'keyword',
                _meta: {
                  description: 'LLM model identifier',
                },
              },
              count: {
                type: 'long',
                _meta: {
                  description: 'Number of LLM invocations for this model',
                },
              },
            },
          },
        },
        errors: {
          total: {
            type: 'long',
            _meta: {
              description: 'Total number of errors surfaced to users',
            },
          },
          avg_errors_per_conversation: {
            type: 'float',
            _meta: {
              description: 'Average number of errors per conversation that had errors',
            },
          },
          total_conversations_with_errors: {
            type: 'long',
            _meta: {
              description: 'Total number of unique conversations that had at least one error',
            },
          },
          by_type: {
            type: 'array',
            items: {
              type: {
                type: 'keyword',
                _meta: {
                  description: 'Error type/code (e.g., internalError, badRequest)',
                },
              },
              count: {
                type: 'long',
                _meta: {
                  description: 'Number of errors of this type',
                },
              },
            },
          },
        },
      },
      fetch: async (context: CollectorFetchContext): Promise<AgentBuilderTelemetry> => {
        const { esClient, soClient } = context;
        const queryUtils = new QueryUtils(esClient, soClient, logger);

        try {
          const customTools = await queryUtils.getCustomToolsMetrics();

          const customAgents = await queryUtils.getCustomAgentsMetrics();

          const conversations = await queryUtils.getConversationMetrics();

          // Fetch TTFT/TTLT metrics from conversation data
          const timeToFirstToken = await queryUtils.getTTFTMetrics();
          const timeToLastToken = await queryUtils.getTTLTMetrics();
          const queryToResultTime = {
            p50: timeToLastToken.p50,
            p75: timeToLastToken.p75,
            p90: timeToLastToken.p90,
            p95: timeToLastToken.p95,
            p99: timeToLastToken.p99,
            mean: timeToLastToken.mean,
          };
          const tokensByModel = await queryUtils.getTokensByModel();
          const queryToResultTimeByModel = await queryUtils.getQueryToResultTimeByModel();
          const queryToResultTimeByAgentType = await queryUtils.getQueryToResultTimeByAgentType();
          const toolCallsByModel = await queryUtils.getToolCallsByModel();

          const toolCallCounters = await queryUtils.getCountersByPrefix(
            AGENTBUILDER_USAGE_DOMAIN,
            `${AGENTBUILDER_USAGE_DOMAIN}_tool_call_`
          );

          const toolCallsBySource = {
            default_agent:
              toolCallCounters.get(`${AGENTBUILDER_USAGE_DOMAIN}_tool_call_default_agent`) || 0,
            custom_agent:
              toolCallCounters.get(`${AGENTBUILDER_USAGE_DOMAIN}_tool_call_custom_agent`) || 0,
            mcp: toolCallCounters.get(`${AGENTBUILDER_USAGE_DOMAIN}_tool_call_mcp`) || 0,
            api: toolCallCounters.get(`${AGENTBUILDER_USAGE_DOMAIN}_tool_call_api`) || 0,
            a2a: toolCallCounters.get(`${AGENTBUILDER_USAGE_DOMAIN}_tool_call_a2a`) || 0,
          };
          const totalToolCalls = Object.values(toolCallsBySource).reduce(
            (sum, count) => sum + count,
            0
          );

          const llmProviderCounters = await queryUtils.getCountersByPrefix(
            AGENTBUILDER_USAGE_DOMAIN,
            `${AGENTBUILDER_USAGE_DOMAIN}_llm_provider_`
          );
          const llmModelCounters = await queryUtils.getCountersByPrefix(
            AGENTBUILDER_USAGE_DOMAIN,
            `${AGENTBUILDER_USAGE_DOMAIN}_llm_model_`
          );

          const llmUsageByProvider: Array<{ provider: string; count: number }> = [];
          for (const [counterName, count] of Array.from(llmProviderCounters.entries())) {
            const provider = counterName.replace(`${AGENTBUILDER_USAGE_DOMAIN}_llm_provider_`, '');
            if (provider && count > 0) {
              llmUsageByProvider.push({ provider, count });
            }
          }
          llmUsageByProvider.sort((a, b) => b.count - a.count);

          const llmUsageByModel: Array<{ model: string; count: number }> = [];
          for (const [counterName, count] of Array.from(llmModelCounters.entries())) {
            const model = counterName.replace(`${AGENTBUILDER_USAGE_DOMAIN}_llm_model_`, '');
            if (model && count > 0) {
              llmUsageByModel.push({ model, count });
            }
          }
          llmUsageByModel.sort((a, b) => b.count - a.count);

          const errorCounters = await queryUtils.getCountersByPrefix(
            AGENTBUILDER_USAGE_DOMAIN,
            `${AGENTBUILDER_USAGE_DOMAIN}_error_`
          );

          const totalErrors = errorCounters.get(`${AGENTBUILDER_USAGE_DOMAIN}_error_total`) || 0;
          const totalConversationsWithErrors =
            errorCounters.get(`${AGENTBUILDER_USAGE_DOMAIN}_error_conversations_with_errors`) || 0;
          const avgErrorsPerConversation =
            totalConversationsWithErrors > 0 ? totalErrors / totalConversationsWithErrors : 0;

          const errorsByType: Array<{ type: string; count: number }> = [];

          for (const [counterName, count] of Array.from(errorCounters.entries())) {
            if (count > 0) {
              if (counterName.startsWith(`${AGENTBUILDER_USAGE_DOMAIN}_error_by_type_`)) {
                const errorType = counterName.replace(
                  `${AGENTBUILDER_USAGE_DOMAIN}_error_by_type_`,
                  ''
                );
                if (errorType) {
                  errorsByType.push({ type: errorType, count });
                }
              }
            }
          }

          errorsByType.sort((a, b) => b.count - a.count);

          const telemetry: AgentBuilderTelemetry = {
            custom_tools: customTools,
            custom_agents: { total: customAgents },
            conversations,
            query_to_result_time: queryToResultTime,
            time_to_first_token: timeToFirstToken,
            tokens_by_model: tokensByModel,
            query_to_result_time_by_model: queryToResultTimeByModel,
            query_to_result_time_by_agent_type: queryToResultTimeByAgentType,
            tool_calls_by_model: toolCallsByModel,
            tool_calls: {
              total: totalToolCalls,
              by_source: toolCallsBySource,
            },
            llm_usage: {
              by_provider: llmUsageByProvider,
              by_model: llmUsageByModel,
            },
            errors: {
              total: totalErrors,
              avg_errors_per_conversation: avgErrorsPerConversation,
              total_conversations_with_errors: totalConversationsWithErrors,
              by_type: errorsByType,
            },
          };

          return telemetry;
        } catch (error) {
          logger.error(`Failed to collect telemetry: ${error.message}`);
          // Return empty/default values on error
          return {
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
            tokens_by_model: [],
            query_to_result_time_by_model: [],
            query_to_result_time_by_agent_type: [],
            tool_calls_by_model: [],
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
          };
        }
      },
    })
  );

  logger.info('Registered telemetry collector for agent_builder');
}
