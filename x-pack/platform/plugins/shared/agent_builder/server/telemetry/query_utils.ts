/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { chatSystemIndex } from '@kbn/agent-builder-server';

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
   * @param domainId - Domain identifier (e.g., 'agentBuilder')
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
      this.logger.warn(`Failed to fetch custom tools counts: ${error.message}`);
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
      this.logger.warn(`Failed to fetch custom agents count: ${error.message}`);
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

      return {
        total: totalConversations,
        total_rounds: totalRounds,
        avg_rounds_per_conversation: Math.round(avgRoundsPerConversation * 100) / 100,
        rounds_distribution: roundsDistribution,
      };
    } catch (error) {
      this.logger.warn(`Failed to fetch conversation metrics: ${error.message}`);
      return {
        total: 0,
        total_rounds: 0,
        avg_rounds_per_conversation: 0,
        rounds_distribution: [],
      };
    }
  }

  /**
   * Calculate percentiles from bucketed time data
   * @param buckets - Map of bucket name → count
   * @returns Calculated percentiles (p50, p75, p90, p95, p99, mean)
   */
  calculatePercentilesFromBuckets(buckets: Map<string, number>): {
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
    mean: number;
  } {
    // Bucket boundaries (in milliseconds)
    const bucketRanges: Record<string, { min: number; max: number; mid: number }> = {
      'query_to_result_time_<1s': { min: 0, max: 1000, mid: 500 },
      'query_to_result_time_1-5s': { min: 1000, max: 5000, mid: 3000 },
      'query_to_result_time_5-10s': { min: 5000, max: 10000, mid: 7500 },
      'query_to_result_time_10-30s': { min: 10000, max: 30000, mid: 20000 },
      'query_to_result_time_30s+': { min: 30000, max: 120000, mid: 60000 },
    };

    // Build cumulative distribution
    const sortedBuckets = [
      'query_to_result_time_<1s',
      'query_to_result_time_1-5s',
      'query_to_result_time_5-10s',
      'query_to_result_time_10-30s',
      'query_to_result_time_30s+',
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
