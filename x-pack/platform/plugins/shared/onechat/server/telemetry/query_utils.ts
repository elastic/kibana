/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { chatSystemIndex } from '@kbn/onechat-server';
import {
  connectorToInference,
  getConnectorModel,
  isSupportedConnector,
} from '@kbn/inference-common';

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
   * @param domainId - Domain identifier (e.g., 'onechat')
   * @returns Array of usage counter data
   */
  async getCountersByDomain(domainId: string): Promise<UsageCounterData[]> {
    try {
      const { saved_objects: savedObjects } = await this.soClient.find<{
        domainId: string;
        counterName: string;
        counterType: string;
        count: number;
      }>({
        type: 'usage-counter',
        perPage: 10000,
        filter: `usage-counter.attributes.domainId:"${domainId}"`,
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
   * @returns Map of counter name → count
   */
  async getCountersByPrefix(domainId: string, prefix: string): Promise<Map<string, number>> {
    try {
      const allCounters = await this.getCountersByDomain(domainId);
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
   * Get connector info and map connector_id to model
   * @param connectorIds - List of connector IDs to look up
   * @returns Map of connector_id to model name
   */
  private async getConnectorIdToModelMap(connectorIds: string[]): Promise<Map<string, string>> {
    const connectorIdToModel = new Map<string, string>();

    if (connectorIds.length === 0) {
      return connectorIdToModel;
    }

    try {
      // Load connectors from saved objects
      const connectorResults = await this.soClient.bulkGet<{
        actionTypeId: string;
        name: string;
        config?: Record<string, any>;
      }>(
        connectorIds.map((id) => ({
          type: 'action',
          id,
        }))
      );

      for (const result of connectorResults.saved_objects) {
        if (result.error) {
          // Connector not found or access denied - use connectorId_unknown
          connectorIdToModel.set(result.id, `${result.id}_unknown`);
          continue;
        }

        const rawConnector = {
          id: result.id,
          actionTypeId: result.attributes.actionTypeId,
          name: result.attributes.name,
          config: result.attributes.config,
        };

        try {
          if (isSupportedConnector(rawConnector)) {
            const inferenceConnector = connectorToInference(rawConnector);
            const model = getConnectorModel(inferenceConnector) || 'unknown';
            // Use format: connectorId_model to differentiate connectors with same model
            connectorIdToModel.set(result.id, `${result.id}_${model}`);
          } else {
            connectorIdToModel.set(result.id, `${result.id}_unknown`);
          }
        } catch (e) {
          connectorIdToModel.set(result.id, `${result.id}_unknown`);
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to load connectors for model mapping: ${error.message}`);
      // If we can't load connectors, map all to connectorId_unknown
      for (const id of connectorIds) {
        connectorIdToModel.set(id, `${id}_unknown`);
      }
    }

    return connectorIdToModel;
  }

  /**
   * Get latency breakdown by model
   * Returns TTFT and TTLT p50/p95 for each model
   * Maps connector_id to model at runtime
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
      const connectorBuckets = aggs?.by_connector?.buckets || [];

      if (connectorBuckets.length === 0) {
        return [];
      }

      // Get unique connector IDs and map them to models
      const connectorIds = connectorBuckets.map((bucket: any) => bucket.key as string);
      const connectorIdToModel = await this.getConnectorIdToModelMap(connectorIds);

      // Map each connector to its model identifier (format: connectorId_modelName)
      const results: Array<{
        model: string;
        ttft_p50: number;
        ttft_p95: number;
        ttlt_p50: number;
        ttlt_p95: number;
        sample_count: number;
      }> = [];

      for (const bucket of connectorBuckets) {
        const connectorId = bucket.key as string;
        const model = connectorIdToModel.get(connectorId) || `${connectorId}_unknown`;

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
   * Get latency breakdown by agent
   * Returns TTFT and TTLT p50/p95 for each agent_id
   */
  async getLatencyByAgentType(): Promise<
    Array<{
      agent_id: string;
      ttft_p50: number;
      ttft_p95: number;
      ttlt_p50: number;
      ttlt_p95: number;
      sample_count: number;
    }>
  > {
    try {
      const conversationIndexName = chatSystemIndex('conversations');

      // Get latency metrics grouped by agent_id
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
                  count: {
                    value_count: {
                      field: 'conversation_rounds.time_to_first_token',
                    },
                  },
                },
              },
            },
          },
        },
      });

      const buckets = (response.aggregations?.by_agent as any)?.buckets || [];

      return buckets.map((bucket: any) => {
        const roundsAggs = bucket.all_rounds;
        return {
          agent_id: bucket.key,
          ttft_p50: Math.round(roundsAggs?.ttft_percentiles?.values?.['50.0'] || 0),
          ttft_p95: Math.round(roundsAggs?.ttft_percentiles?.values?.['95.0'] || 0),
          ttlt_p50: Math.round(roundsAggs?.ttlt_percentiles?.values?.['50.0'] || 0),
          ttlt_p95: Math.round(roundsAggs?.ttlt_percentiles?.values?.['95.0'] || 0),
          sample_count: roundsAggs?.count?.value || 0,
        };
      });
    } catch (error) {
      if (!isIndexNotFoundError(error)) {
        this.logger.warn(`Failed to fetch latency by agent: ${error.message}`);
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
    domainPrefix: string = 'onechat'
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
