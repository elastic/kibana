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
import { ONECHAT_USAGE_DOMAIN } from './usage_counters';

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
 * Latency stats for a specific dimension (connector, agent type)
 */
interface LatencyStats {
  ttft_p50: number;
  ttft_p95: number;
  ttlt_p50: number;
  ttlt_p95: number;
  sample_count: number;
}

/**
 * Telemetry payload schema for Agent Builder
 */
export interface OnechatTelemetry {
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
  time_to_last_token: TimingPercentiles;
  latency_by_model: Array<
    {
      model: string;
    } & LatencyStats
  >;
  latency_by_agent_type: Array<
    {
      agent_id: string;
    } & LatencyStats
  >;
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
    usageCollection.makeUsageCollector<OnechatTelemetry>({
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
        time_to_last_token: {
          p50: {
            type: 'long',
            _meta: {
              description: '50th percentile time-to-last-token in milliseconds',
            },
          },
          p75: {
            type: 'long',
            _meta: {
              description: '75th percentile time-to-last-token in milliseconds',
            },
          },
          p90: {
            type: 'long',
            _meta: {
              description: '90th percentile time-to-last-token in milliseconds',
            },
          },
          p95: {
            type: 'long',
            _meta: {
              description: '95th percentile time-to-last-token in milliseconds',
            },
          },
          p99: {
            type: 'long',
            _meta: {
              description: '99th percentile time-to-last-token in milliseconds',
            },
          },
          mean: {
            type: 'long',
            _meta: {
              description: 'Mean time-to-last-token in milliseconds',
            },
          },
          total_samples: {
            type: 'long',
            _meta: {
              description: 'Total number of TTLT samples',
            },
          },
        },
        latency_by_model: {
          type: 'array',
          items: {
            model: {
              type: 'keyword',
              _meta: {
                description: 'Model identifier (e.g., gpt-4o, claude-3-sonnet)',
              },
            },
            ttft_p50: {
              type: 'long',
              _meta: {
                description: '50th percentile TTFT for this model',
              },
            },
            ttft_p95: {
              type: 'long',
              _meta: {
                description: '95th percentile TTFT for this model',
              },
            },
            ttlt_p50: {
              type: 'long',
              _meta: {
                description: '50th percentile TTLT for this model',
              },
            },
            ttlt_p95: {
              type: 'long',
              _meta: {
                description: '95th percentile TTLT for this model',
              },
            },
            sample_count: {
              type: 'long',
              _meta: {
                description: 'Number of samples for this model',
              },
            },
          },
        },
        latency_by_agent_type: {
          type: 'array',
          items: {
            agent_id: {
              type: 'keyword',
              _meta: {
                description: 'Agent ID',
              },
            },
            ttft_p50: {
              type: 'long',
              _meta: {
                description: '50th percentile TTFT for this agent',
              },
            },
            ttft_p95: {
              type: 'long',
              _meta: {
                description: '95th percentile TTFT for this agent',
              },
            },
            ttlt_p50: {
              type: 'long',
              _meta: {
                description: '50th percentile TTLT for this agent',
              },
            },
            ttlt_p95: {
              type: 'long',
              _meta: {
                description: '95th percentile TTLT for this agent',
              },
            },
            sample_count: {
              type: 'long',
              _meta: {
                description: 'Number of samples for this agent',
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
      fetch: async (context: CollectorFetchContext): Promise<OnechatTelemetry> => {
        const { esClient, soClient } = context;
        const queryUtils = new QueryUtils(esClient, soClient, logger);

        try {
          const customTools = await queryUtils.getCustomToolsMetrics();

          const customAgents = await queryUtils.getCustomAgentsMetrics();

          const conversations = await queryUtils.getConversationMetrics();

          const queryTimeCounters = await queryUtils.getCountersByPrefix(
            ONECHAT_USAGE_DOMAIN,
            `${ONECHAT_USAGE_DOMAIN}_query_to_result_time_`
          );
          const queryToResultTime = queryUtils.calculatePercentilesFromBuckets(
            queryTimeCounters,
            ONECHAT_USAGE_DOMAIN
          );

          // Fetch TTFT/TTLT metrics from conversation data
          const timeToFirstToken = await queryUtils.getTTFTMetrics();
          const timeToLastToken = await queryUtils.getTTLTMetrics();
          const latencyByModel = await queryUtils.getLatencyByModel();
          const latencyByAgentType = await queryUtils.getLatencyByAgentType();

          const toolCallCounters = await queryUtils.getCountersByPrefix(
            ONECHAT_USAGE_DOMAIN,
            `${ONECHAT_USAGE_DOMAIN}_tool_call_`
          );

          const toolCallsBySource = {
            default_agent:
              toolCallCounters.get(`${ONECHAT_USAGE_DOMAIN}_tool_call_default_agent`) || 0,
            custom_agent:
              toolCallCounters.get(`${ONECHAT_USAGE_DOMAIN}_tool_call_custom_agent`) || 0,
            mcp: toolCallCounters.get(`${ONECHAT_USAGE_DOMAIN}_tool_call_mcp`) || 0,
            api: toolCallCounters.get(`${ONECHAT_USAGE_DOMAIN}_tool_call_api`) || 0,
            a2a: toolCallCounters.get(`${ONECHAT_USAGE_DOMAIN}_tool_call_a2a`) || 0,
          };
          const totalToolCalls = Object.values(toolCallsBySource).reduce(
            (sum, count) => sum + count,
            0
          );

          const llmProviderCounters = await queryUtils.getCountersByPrefix(
            ONECHAT_USAGE_DOMAIN,
            `${ONECHAT_USAGE_DOMAIN}_llm_provider_`
          );
          const llmModelCounters = await queryUtils.getCountersByPrefix(
            ONECHAT_USAGE_DOMAIN,
            `${ONECHAT_USAGE_DOMAIN}_llm_model_`
          );

          const llmUsageByProvider: Array<{ provider: string; count: number }> = [];
          for (const [counterName, count] of Array.from(llmProviderCounters.entries())) {
            const provider = counterName.replace(`${ONECHAT_USAGE_DOMAIN}_llm_provider_`, '');
            if (provider && count > 0) {
              llmUsageByProvider.push({ provider, count });
            }
          }
          llmUsageByProvider.sort((a, b) => b.count - a.count);

          const llmUsageByModel: Array<{ model: string; count: number }> = [];
          for (const [counterName, count] of Array.from(llmModelCounters.entries())) {
            const model = counterName.replace(`${ONECHAT_USAGE_DOMAIN}_llm_model_`, '');
            if (model && count > 0) {
              llmUsageByModel.push({ model, count });
            }
          }
          llmUsageByModel.sort((a, b) => b.count - a.count);

          const errorCounters = await queryUtils.getCountersByPrefix(
            ONECHAT_USAGE_DOMAIN,
            `${ONECHAT_USAGE_DOMAIN}_error_`
          );

          const totalErrors = errorCounters.get(`${ONECHAT_USAGE_DOMAIN}_error_total`) || 0;
          const totalConversationsWithErrors =
            errorCounters.get(`${ONECHAT_USAGE_DOMAIN}_error_conversations_with_errors`) || 0;
          const avgErrorsPerConversation =
            totalConversationsWithErrors > 0 ? totalErrors / totalConversationsWithErrors : 0;

          const errorsByType: Array<{ type: string; count: number }> = [];

          for (const [counterName, count] of Array.from(errorCounters.entries())) {
            if (count > 0) {
              if (counterName.startsWith(`${ONECHAT_USAGE_DOMAIN}_error_by_type_`)) {
                const errorType = counterName.replace(`${ONECHAT_USAGE_DOMAIN}_error_by_type_`, '');
                if (errorType) {
                  errorsByType.push({ type: errorType, count });
                }
              }
            }
          }

          errorsByType.sort((a, b) => b.count - a.count);

          const telemetry: OnechatTelemetry = {
            custom_tools: customTools,
            custom_agents: { total: customAgents },
            conversations,
            query_to_result_time: queryToResultTime,
            time_to_first_token: timeToFirstToken,
            time_to_last_token: timeToLastToken,
            latency_by_model: latencyByModel,
            latency_by_agent_type: latencyByAgentType,
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
          };
        }
      },
    })
  );

  logger.info('Registered telemetry collector for agent_builder');
}
