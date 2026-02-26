/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { chatSystemIndex } from '@kbn/agent-builder-server';

export const isIndexNotFoundError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const castError = error as {
    attributes?: {
      caused_by?: { type?: string };
      error?: { caused_by?: { type?: string } };
    };
    message?: string;
    meta?: {
      body?: {
        error?: {
          type?: string;
          caused_by?: { type?: string };
        };
      };
    };
  };

  // Check various error structure formats from Elasticsearch client
  return (
    castError.attributes?.caused_by?.type === 'index_not_found_exception' ||
    castError.attributes?.error?.caused_by?.type === 'index_not_found_exception' ||
    castError.meta?.body?.error?.type === 'index_not_found_exception' ||
    castError.meta?.body?.error?.caused_by?.type === 'index_not_found_exception' ||
    (typeof castError.message === 'string' &&
      castError.message.includes('index_not_found_exception'))
  );
};

/**
 * Usage counter data from saved objects
 */
export interface UsageCounterData {
  counterName: string;
  counterType: string;
  count: number;
  domainId: string;
}

/**
 * Query utilities for telemetry data collection
 *
 * Provides helpers for querying:
 * - Usage counters from saved objects
 * - Conversation data from Elasticsearch
 * - Custom tools and agents from Elasticsearch
 */
export class QueryUtils {
  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly soClient: SavedObjectsClientContract,
    private readonly logger: Logger
  ) {}

  /**
   * Get all usage counters for a specific domain
   * @param domainId - Domain identifier (e.g., 'agent_builder')
   * @param lookbackMs - Optional lookback window in milliseconds (defaults to last 24h)
   * @returns Array of usage counter data
   */
  async getCountersByDomain(
    domainId: string,
    lookbackMs: number = 24 * 60 * 60 * 1000
  ): Promise<UsageCounterData[]> {
    try {
      const fromDate = new Date(Date.now() - lookbackMs).toISOString();
      const { saved_objects: savedObjects } = await this.soClient.find<{
        domainId: string;
        counterName: string;
        counterType: string;
        count: number;
      }>({
        type: 'usage-counter',
        perPage: 10000,
        filter: `usage-counter.attributes.domainId:"${domainId}" and usage-counter.updated_at >= "${fromDate}"`,
      });

      return savedObjects.map((so) => ({
        counterName: so.attributes.counterName,
        counterType: so.attributes.counterType,
        count: so.attributes.count,
        domainId: so.attributes.domainId,
      }));
    } catch (error) {
      this.logger.error(`Failed to query usage counters: ${error.message}`);
      return [];
    }
  }

  /**
   * Get usage counters filtered by name prefix
   * @param domainId - Domain identifier
   * @param prefix - Counter name prefix (e.g., 'tool_call_')
   * @param lookbackMs
   * @returns Map of counter name → count
   */
  async getCountersByPrefix(
    domainId: string,
    prefix: string,
    lookbackMs: number = 24 * 60 * 60 * 1000
  ): Promise<Map<string, number>> {
    try {
      const allCounters = await this.getCountersByDomain(domainId, lookbackMs);
      const filtered = allCounters.filter((counter) => counter.counterName.startsWith(prefix));

      const result = new Map<string, number>();
      for (const counter of filtered) {
        result.set(counter.counterName, counter.count);
      }

      return result;
    } catch (error) {
      this.logger.error(`Failed to query counters by prefix "${prefix}": ${error.message}`);
      return new Map();
    }
  }

  async getCustomToolsMetrics() {
    try {
      const toolIndexName = chatSystemIndex('tools');
      const response = await this.esClient.search({
        index: toolIndexName,
        size: 0,
        aggs: {
          by_type: {
            terms: {
              field: 'type',
              size: 100,
            },
          },
        },
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
      });

      const buckets = (response.aggregations?.by_type as any)?.buckets || [];
      const byType = buckets.map((bucket: any) => ({
        type: bucket.key as string,
        count: bucket.doc_count as number,
      }));

      const total = buckets.reduce((sum: number, bucket: any) => sum + bucket.doc_count, 0);

      return {
        total,
        by_type: byType,
      };
    } catch (error) {
      // Suppress warning for missing index - expected when no tools have been created yet
      if (!isIndexNotFoundError(error)) {
        this.logger.warn(`Failed to fetch custom tools counts: ${error.message}`);
      }
      return {
        total: 0,
        by_type: [],
      };
    }
  }

  /**
   * Get counts of custom agents from Elasticsearch
   */
  async getCustomAgentsMetrics() {
    try {
      const agentsIndexName = chatSystemIndex('agents');
      const response = await this.esClient.count({
        index: agentsIndexName,
      });

      return response.count || 0;
    } catch (error) {
      // Suppress warning for missing index - expected when no agents have been created yet
      if (!isIndexNotFoundError(error)) {
        this.logger.warn(`Failed to fetch custom agents count: ${error.message}`);
      }
      return 0;
    }
  }

  /**
   * Get conversation metrics from Elasticsearch
   */
  async getConversationMetrics() {
    try {
      const conversationIndexName = chatSystemIndex('conversations');
      const response = await this.esClient.search({
        index: conversationIndexName,
        size: 0,
        track_total_hits: true,
        aggs: {
          rounds_distribution: {
            terms: {
              script: {
                source: `
                def source = params._source;
                def roundsArray = source.conversation_rounds != null ? source.conversation_rounds : source.rounds;
                def rounds = roundsArray != null ? roundsArray.size() : 0;

                if (rounds <= 5) return '1-5';
                if (rounds <= 10) return '6-10';
                if (rounds <= 20) return '11-20';
                if (rounds <= 50) return '21-50';
                return '51+';
              `,
                lang: 'painless',
              },
              size: 100,
            },
          },
          total_tokens: {
            sum: {
              script: {
                source: `
                  def source = params._source;
                  def roundsArray = source.conversation_rounds != null ? source.conversation_rounds : source.rounds;
                  def totalTokens = 0;
                  if (roundsArray != null) {
                    for (def round : roundsArray) {
                      if (round.model_usage != null) {
                        def inputTokens = round.model_usage.input_tokens != null ? round.model_usage.input_tokens : 0;
                        def outputTokens = round.model_usage.output_tokens != null ? round.model_usage.output_tokens : 0;
                        totalTokens += inputTokens + outputTokens;
                      }
                    }
                  }
                  return totalTokens;
                `,
                lang: 'painless',
              },
            },
          },
        },
      });

      const buckets = (response.aggregations?.rounds_distribution as any)?.buckets || [];
      const roundsDistribution = buckets.map((bucket: any) => ({
        bucket: bucket.key as string,
        count: bucket.doc_count as number,
      }));

      // Calculate total rounds and average
      let totalRounds = 0;
      buckets.forEach((bucket: any) => {
        const bucketKey = bucket.key as string;
        const count = bucket.doc_count as number;
        if (bucketKey === '1-5') {
          totalRounds += count * 3; // Approximate: use middle value
        } else if (bucketKey === '6-10') {
          totalRounds += count * 8;
        } else if (bucketKey === '11-20') {
          totalRounds += count * 15;
        } else if (bucketKey === '21-50') {
          totalRounds += count * 35;
        } else {
          totalRounds += count * 75; // Approximate for 51+
        }
      });

      const total = response.hits.total as any;
      const totalConversations = typeof total === 'number' ? total : total?.value || 0;
      const avgRoundsPerConversation =
        totalConversations > 0 ? totalRounds / totalConversations : 0;

      const totalTokensAgg = response.aggregations?.total_tokens as any;
      const tokensUsed = totalTokensAgg?.value || 0;
      const averageTokensPerConversation =
        totalConversations > 0 ? tokensUsed / totalConversations : 0;

      return {
        total: totalConversations,
        total_rounds: totalRounds,
        avg_rounds_per_conversation: Math.round(avgRoundsPerConversation * 100) / 100,
        rounds_distribution: roundsDistribution,
        tokens_used: Math.round(tokensUsed),
        average_tokens_per_conversation: Math.round(averageTokensPerConversation * 100) / 100,
      };
    } catch (error) {
      if (!isIndexNotFoundError(error)) {
        this.logger.warn(`Failed to fetch conversation metrics: ${error.message}`);
      }
      return {
        total: 0,
        total_rounds: 0,
        avg_rounds_per_conversation: 0,
        rounds_distribution: [],
        tokens_used: 0,
        average_tokens_per_conversation: 0,
      };
    }
  }

  /**
   * TTFT/TTLT percentile metrics structure
   */
  private readonly defaultTimingMetrics = {
    p50: 0,
    p75: 0,
    p90: 0,
    p95: 0,
    p99: 0,
    mean: 0,
    total_samples: 0,
  };

  /**
   * Get Time-to-First-Token (TTFT) metrics from conversation rounds
   * Queries the conversations index and aggregates TTFT data
   */
  async getTTFTMetrics(): Promise<{
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
    mean: number;
    total_samples: number;
  }> {
    try {
      const conversationIndexName = chatSystemIndex('conversations');
      const response = await this.esClient.search({
        index: conversationIndexName,
        size: 0,
        aggs: {
          all_rounds: {
            nested: {
              path: 'conversation_rounds',
            },
            aggs: {
              ttft_percentiles: {
                percentiles: {
                  field: 'conversation_rounds.time_to_first_token',
                  percents: [50, 75, 90, 95, 99],
                },
              },
              ttft_avg: {
                avg: {
                  field: 'conversation_rounds.time_to_first_token',
                },
              },
              ttft_count: {
                value_count: {
                  field: 'conversation_rounds.time_to_first_token',
                },
              },
            },
          },
        },
      });

      const aggs = response.aggregations?.all_rounds as any;
      if (!aggs) {
        return { ...this.defaultTimingMetrics };
      }

      const percentiles = aggs.ttft_percentiles?.values || {};
      return {
        p50: Math.round(percentiles['50.0'] || 0),
        p75: Math.round(percentiles['75.0'] || 0),
        p90: Math.round(percentiles['90.0'] || 0),
        p95: Math.round(percentiles['95.0'] || 0),
        p99: Math.round(percentiles['99.0'] || 0),
        mean: Math.round(aggs.ttft_avg?.value || 0),
        total_samples: aggs.ttft_count?.value || 0,
      };
    } catch (error) {
      if (!isIndexNotFoundError(error)) {
        this.logger.warn(`Failed to fetch TTFT metrics: ${error.message}`);
      }
      return { ...this.defaultTimingMetrics };
    }
  }

  /**
   * Get Time-to-Last-Token (TTLT) metrics from conversation rounds
   * Queries the conversations index and aggregates TTLT data
   */
  async getTTLTMetrics(): Promise<{
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
    mean: number;
    total_samples: number;
  }> {
    try {
      const conversationIndexName = chatSystemIndex('conversations');
      const response = await this.esClient.search({
        index: conversationIndexName,
        size: 0,
        aggs: {
          all_rounds: {
            nested: {
              path: 'conversation_rounds',
            },
            aggs: {
              ttlt_percentiles: {
                percentiles: {
                  field: 'conversation_rounds.time_to_last_token',
                  percents: [50, 75, 90, 95, 99],
                },
              },
              ttlt_avg: {
                avg: {
                  field: 'conversation_rounds.time_to_last_token',
                },
              },
              ttlt_count: {
                value_count: {
                  field: 'conversation_rounds.time_to_last_token',
                },
              },
            },
          },
        },
      });

      const aggs = response.aggregations?.all_rounds as any;
      if (!aggs) {
        return { ...this.defaultTimingMetrics };
      }

      const percentiles = aggs.ttlt_percentiles?.values || {};
      return {
        p50: Math.round(percentiles['50.0'] || 0),
        p75: Math.round(percentiles['75.0'] || 0),
        p90: Math.round(percentiles['90.0'] || 0),
        p95: Math.round(percentiles['95.0'] || 0),
        p99: Math.round(percentiles['99.0'] || 0),
        mean: Math.round(aggs.ttlt_avg?.value || 0),
        total_samples: aggs.ttlt_count?.value || 0,
      };
    } catch (error) {
      if (!isIndexNotFoundError(error)) {
        this.logger.warn(`Failed to fetch TTLT metrics: ${error.message}`);
      }
      return { ...this.defaultTimingMetrics };
    }
  }

  /**
   * Get latency breakdown by model
   * Returns TTFT and TTLT p50/p95 for each model
   * Uses stored model info from conversation rounds
   */
  async getLatencyByModel(): Promise<
    Array<{
      model: string;
      ttft_p50: number;
      ttft_p95: number;
      ttlt_p50: number;
      ttlt_p95: number;
      sample_count: number;
    }>
  > {
    try {
      const conversationIndexName = chatSystemIndex('conversations');
      const response = await this.esClient.search({
        index: conversationIndexName,
        size: 0,
        aggs: {
          all_rounds: {
            nested: {
              path: 'conversation_rounds',
            },
            aggs: {
              by_model: {
                terms: {
                  field: 'conversation_rounds.model_usage.model',
                  size: 50,
                },
                aggs: {
                  ttft_percentiles: {
                    percentiles: {
                      field: 'conversation_rounds.time_to_first_token',
                      percents: [50, 95],
                    },
                  },
                  ttlt_percentiles: {
                    percentiles: {
                      field: 'conversation_rounds.time_to_last_token',
                      percents: [50, 95],
                    },
                  },
                },
              },
              by_connector: {
                terms: {
                  field: 'conversation_rounds.model_usage.connector_id',
                  size: 50,
                },
                aggs: {
                  ttft_percentiles: {
                    percentiles: {
                      field: 'conversation_rounds.time_to_first_token',
                      percents: [50, 95],
                    },
                  },
                  ttlt_percentiles: {
                    percentiles: {
                      field: 'conversation_rounds.time_to_last_token',
                      percents: [50, 95],
                    },
                  },
                },
              },
            },
          },
        },
      });

      const aggs = response.aggregations?.all_rounds as any;
      const modelBuckets = aggs?.by_model?.buckets || [];

      if (modelBuckets.length === 0) {
        return [];
      }

      const results: Array<{
        model: string;
        ttft_p50: number;
        ttft_p95: number;
        ttlt_p50: number;
        ttlt_p95: number;
        sample_count: number;
      }> = [];

      // Process rounds grouped by stored model field
      for (const bucket of modelBuckets) {
        const model = bucket.key as string;
        const ttftp50 = bucket.ttft_percentiles?.values?.['50.0'] || 0;
        const ttftp95 = bucket.ttft_percentiles?.values?.['95.0'] || 0;
        const ttltp50 = bucket.ttlt_percentiles?.values?.['50.0'] || 0;
        const ttltp95 = bucket.ttlt_percentiles?.values?.['95.0'] || 0;
        const sampleCount = bucket.doc_count || 0;

        if (sampleCount === 0) continue;

        results.push({
          model,
          ttft_p50: Math.round(ttftp50),
          ttft_p95: Math.round(ttftp95),
          ttlt_p50: Math.round(ttltp50),
          ttlt_p95: Math.round(ttltp95),
          sample_count: sampleCount,
        });
      }

      // Sort by sample count descending
      results.sort((a, b) => b.sample_count - a.sample_count);

      return results;
    } catch (error) {
      if (!isIndexNotFoundError(error)) {
        this.logger.warn(`Failed to fetch latency by model: ${error.message}`);
      }
      return [];
    }
  }

  /**
   * Get query-to-result time (TTLT) grouped by agent
   * Returns TTLT percentiles/mean for each agent_id
   */
  async getQueryToResultTimeByAgentType(): Promise<
    Array<{
      agent_id: string;
      p50: number;
      p75: number;
      p90: number;
      p95: number;
      p99: number;
      mean: number;
      total_samples: number;
      sample_count: number;
    }>
  > {
    try {
      const conversationIndexName = chatSystemIndex('conversations');

      // Get TTLT metrics grouped by agent_id
      const response = await this.esClient.search({
        index: conversationIndexName,
        size: 0,
        aggs: {
          by_agent: {
            terms: {
              field: 'agent_id',
              size: 50,
            },
            aggs: {
              all_rounds: {
                nested: {
                  path: 'conversation_rounds',
                },
                aggs: {
                  ttl_percentiles: {
                    percentiles: {
                      field: 'conversation_rounds.time_to_last_token',
                      percents: [50, 75, 90, 95, 99],
                    },
                  },
                  ttl_avg: { avg: { field: 'conversation_rounds.time_to_last_token' } },
                  ttl_count: { value_count: { field: 'conversation_rounds.time_to_last_token' } },
                },
              },
            },
          },
        },
      });

      const buckets = (response.aggregations?.by_agent as any)?.buckets || [];

      return buckets.map((bucket: any) => {
        const roundsAggs = bucket.all_rounds;
        const percentiles = roundsAggs?.ttl_percentiles?.values || {};
        const totalSamples = roundsAggs?.ttl_count?.value || 0;
        return {
          agent_id: bucket.key,
          p50: Math.round(percentiles['50.0'] || 0),
          p75: Math.round(percentiles['75.0'] || 0),
          p90: Math.round(percentiles['90.0'] || 0),
          p95: Math.round(percentiles['95.0'] || 0),
          p99: Math.round(percentiles['99.0'] || 0),
          mean: Math.round(roundsAggs?.ttl_avg?.value || 0),
          total_samples: totalSamples,
          sample_count: totalSamples,
        };
      });
    } catch (error) {
      if (!isIndexNotFoundError(error)) {
        this.logger.warn(`Failed to fetch query-to-result time by agent: ${error.message}`);
      }
      return [];
    }
  }

  /**
   * Get token consumption grouped by model
   */
  async getTokensByModel(): Promise<
    Array<{
      model: string;
      total_tokens: number;
      avg_tokens_per_round: number;
      sample_count: number;
    }>
  > {
    try {
      const conversationIndexName = chatSystemIndex('conversations');
      const response = await this.esClient.search({
        index: conversationIndexName,
        size: 0,
        aggs: {
          all_rounds: {
            nested: {
              path: 'conversation_rounds',
            },
            aggs: {
              by_model: {
                terms: {
                  field: 'conversation_rounds.model_usage.model',
                  size: 50,
                  missing: 'unknown',
                },
                aggs: {
                  input_tokens: {
                    sum: {
                      field: 'conversation_rounds.model_usage.input_tokens',
                    },
                  },
                  output_tokens: {
                    sum: {
                      field: 'conversation_rounds.model_usage.output_tokens',
                    },
                  },
                },
              },
            },
          },
        },
      });

      const buckets = (response.aggregations?.all_rounds as any)?.by_model?.buckets || [];

      const results: Array<{
        model: string;
        total_tokens: number;
        avg_tokens_per_round: number;
        sample_count: number;
      }> = [];

      for (const bucket of buckets) {
        const inputTokens = bucket.input_tokens?.value || 0;
        const outputTokens = bucket.output_tokens?.value || 0;
        const totalTokens = inputTokens + outputTokens;
        const sampleCount = bucket.doc_count || 0;
        const avgTokensPerRound =
          sampleCount > 0 ? Math.round((totalTokens / sampleCount) * 100) / 100 : 0;

        results.push({
          model: bucket.key as string,
          total_tokens: Math.round(totalTokens),
          avg_tokens_per_round: avgTokensPerRound,
          sample_count: sampleCount,
        });
      }

      results.sort((a, b) => b.total_tokens - a.total_tokens);

      return results;
    } catch (error) {
      if (!isIndexNotFoundError(error)) {
        this.logger.warn(`Failed to fetch tokens by model: ${error.message}`);
      }
      return [];
    }
  }

  /**
   * Get query-to-result time (TTLT) grouped by model
   */
  async getQueryToResultTimeByModel(): Promise<
    Array<{
      model: string;
      p50: number;
      p75: number;
      p90: number;
      p95: number;
      p99: number;
      mean: number;
      total_samples: number;
      sample_count: number;
    }>
  > {
    try {
      const conversationIndexName = chatSystemIndex('conversations');
      const response = await this.esClient.search({
        index: conversationIndexName,
        size: 0,
        aggs: {
          all_rounds: {
            nested: {
              path: 'conversation_rounds',
            },
            aggs: {
              by_model: {
                terms: {
                  field: 'conversation_rounds.model_usage.model',
                  size: 50,
                  missing: 'unknown',
                },
                aggs: {
                  ttl_percentiles: {
                    percentiles: {
                      field: 'conversation_rounds.time_to_last_token',
                      percents: [50, 75, 90, 95, 99],
                    },
                  },
                  ttl_avg: {
                    avg: {
                      field: 'conversation_rounds.time_to_last_token',
                    },
                  },
                  ttl_count: {
                    value_count: {
                      field: 'conversation_rounds.time_to_last_token',
                    },
                  },
                },
              },
            },
          },
        },
      });

      const buckets = (response.aggregations?.all_rounds as any)?.by_model?.buckets || [];

      const results: Array<{
        model: string;
        p50: number;
        p75: number;
        p90: number;
        p95: number;
        p99: number;
        mean: number;
        total_samples: number;
        sample_count: number;
      }> = [];

      for (const bucket of buckets) {
        const percentiles = bucket.ttl_percentiles?.values || {};
        results.push({
          model: bucket.key as string,
          p50: Math.round(percentiles['50.0'] || 0),
          p75: Math.round(percentiles['75.0'] || 0),
          p90: Math.round(percentiles['90.0'] || 0),
          p95: Math.round(percentiles['95.0'] || 0),
          p99: Math.round(percentiles['99.0'] || 0),
          mean: Math.round(bucket.ttl_avg?.value || 0),
          total_samples: bucket.ttl_count?.value || 0,
          sample_count: bucket.doc_count || 0,
        });
      }

      results.sort((a, b) => b.sample_count - a.sample_count);

      return results;
    } catch (error) {
      if (!isIndexNotFoundError(error)) {
        this.logger.warn(`Failed to fetch query-to-result time by model: ${error.message}`);
      }
      return [];
    }
  }

  /**
   * Get tool call counts grouped by model based on round steps
   */
  async getToolCallsByModel(): Promise<
    Array<{
      model: string;
      count: number;
    }>
  > {
    try {
      const conversationIndexName = chatSystemIndex('conversations');
      const response = await this.esClient.search({
        index: conversationIndexName,
        size: 0,
        aggs: {
          tool_calls_by_model: {
            scripted_metric: {
              init_script: 'state.modelCalls = new HashMap();',
              map_script: `
                def rounds = params._source.conversation_rounds;
                if (rounds == null) return;
                for (def round : rounds) {
                  def modelUsage = round.model_usage;
                  def model = (modelUsage != null && modelUsage.model != null) ? modelUsage.model : 'unknown';
                  def steps = round.steps;
                  if (steps == null) continue;
                  int callCount = 0;
                  for (def step : steps) {
                    if (step.type != null && step.type == 'tool_call') {
                      callCount += 1;
                    }
                  }
                  if (callCount == 0) continue;
                  def current = state.modelCalls.get(model);
                  if (current == null) {
                    state.modelCalls.put(model, callCount);
                  } else {
                    state.modelCalls.put(model, current + callCount);
                  }
                }
              `,
              combine_script: 'return state.modelCalls;',
              reduce_script: `
                Map combined = new HashMap();
                for (state in states) {
                  for (entry in state.entrySet()) {
                    def model = entry.getKey();
                    def value = entry.getValue();
                    if (combined.containsKey(model)) {
                      combined.put(model, combined.get(model) + value);
                    } else {
                      combined.put(model, value);
                    }
                  }
                }
                return combined;
              `,
            },
          },
        },
      });

      const aggregated = (response.aggregations as any)?.tool_calls_by_model?.value || {};
      const results: Array<{ model: string; count: number }> = [];

      for (const [model, count] of Object.entries(aggregated)) {
        results.push({ model, count: Number(count) });
      }

      results.sort((a, b) => b.count - a.count);

      return results;
    } catch (error) {
      if (!isIndexNotFoundError(error)) {
        this.logger.warn(`Failed to fetch tool calls by model: ${error.message}`);
      }
      return [];
    }
  }

  /**
   * Calculate percentiles from bucketed time data
   * @param buckets - Map of bucket name → count
   * @returns Calculated percentiles (p50, p75, p90, p95, p99, mean)
   */
  calculatePercentilesFromBuckets(
    buckets: Map<string, number>,
    domainPrefix: string = 'agent_builder'
  ): {
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
    mean: number;
  } {
    // Bucket boundaries (in milliseconds) - keys include domain prefix
    const bucketRanges: Record<string, { min: number; max: number; mid: number }> = {
      [`${domainPrefix}_query_to_result_time_<1s`]: { min: 0, max: 1000, mid: 500 },
      [`${domainPrefix}_query_to_result_time_1-5s`]: { min: 1000, max: 5000, mid: 3000 },
      [`${domainPrefix}_query_to_result_time_5-10s`]: { min: 5000, max: 10000, mid: 7500 },
      [`${domainPrefix}_query_to_result_time_10-30s`]: { min: 10000, max: 30000, mid: 20000 },
      [`${domainPrefix}_query_to_result_time_30s+`]: { min: 30000, max: 120000, mid: 60000 },
    };

    // Build cumulative distribution
    const sortedBuckets = [
      `${domainPrefix}_query_to_result_time_<1s`,
      `${domainPrefix}_query_to_result_time_1-5s`,
      `${domainPrefix}_query_to_result_time_5-10s`,
      `${domainPrefix}_query_to_result_time_10-30s`,
      `${domainPrefix}_query_to_result_time_30s+`,
    ];

    let totalCount = 0;
    const cumulativeCounts: Array<{ bucket: string; count: number; cumulative: number }> = [];

    for (const bucketName of sortedBuckets) {
      const count = buckets.get(bucketName) || 0;
      totalCount += count;
      cumulativeCounts.push({
        bucket: bucketName,
        count,
        cumulative: totalCount,
      });
    }

    if (totalCount === 0) {
      return { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0, mean: 0 };
    }

    // Calculate percentiles using linear interpolation
    const calculatePercentile = (percentile: number): number => {
      const targetCount = (percentile / 100) * totalCount;

      for (let i = 0; i < cumulativeCounts.length; i++) {
        const current = cumulativeCounts[i];
        const previous = i > 0 ? cumulativeCounts[i - 1] : { cumulative: 0 };

        if (current.cumulative >= targetCount) {
          const range = bucketRanges[current.bucket];
          if (!range) return 0;

          // Linear interpolation within bucket
          const bucketProgress =
            current.count > 0 ? (targetCount - previous.cumulative) / current.count : 0;

          return range.min + bucketProgress * (range.max - range.min);
        }
      }

      // Fallback to last bucket
      const lastBucket = cumulativeCounts[cumulativeCounts.length - 1];
      return bucketRanges[lastBucket.bucket]?.mid || 0;
    };

    // Calculate mean using bucket midpoints
    let weightedSum = 0;
    for (const { bucket, count } of cumulativeCounts) {
      const range = bucketRanges[bucket];
      if (range) {
        weightedSum += range.mid * count;
      }
    }
    const mean = weightedSum / totalCount;

    return {
      p50: calculatePercentile(50),
      p75: calculatePercentile(75),
      p90: calculatePercentile(90),
      p95: calculatePercentile(95),
      p99: calculatePercentile(99),
      mean,
    };
  }
}
