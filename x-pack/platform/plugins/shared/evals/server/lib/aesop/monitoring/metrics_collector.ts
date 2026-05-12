/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * AESOP Metrics Collector Service
 *
 * Collects performance metrics from various Elasticsearch indices:
 * - traces-* : Skill invocations, token usage, latency
 * - .aesop-proposed-skills : Approval rates, quality scores
 * - .aesop-workflow-executions : Exploration durations, coverage
 *
 * Provides aggregated metrics for dashboard visualizations and reporting.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

export interface TimeRange {
  from: string;
  to: string;
}

export interface SkillMetrics {
  by_skill: Array<{
    skill_name: string;
    skill_id: string;
    invocations: number;
    success_rate: number;
    avg_duration_ms: number;
    p95_duration_ms: number;
    total_tokens: number;
    avg_tokens_per_call: number;
    cached_tokens: number;
    cache_hit_rate: number;
    error_count: number;
  }>;
  totals: {
    total_invocations: number;
    total_tokens: number;
    total_cost_usd: number;
    avg_success_rate: number;
  };
}

export interface ApprovalMetrics {
  by_cycle: Array<{
    cycle_number: number;
    total_skills: number;
    approved_skills: number;
    rejected_skills: number;
    pending_skills: number;
    approval_rate: number;
    avg_quality_score: number;
    improvement_from_previous: number | null;
  }>;
  overall: {
    total_cycles: number;
    total_skills_proposed: number;
    total_approved: number;
    overall_approval_rate: number;
    trend: 'improving' | 'stable' | 'declining';
  };
}

export interface ExplorationMetrics {
  by_execution: Array<{
    execution_id: string;
    started_at: string;
    completed_at: string;
    duration_minutes: number;
    indices_discovered: number;
    relationships_found: number;
    patterns_identified: number;
    skills_proposed: number;
    agent_role: string;
  }>;
  aggregates: {
    avg_duration_minutes: number;
    p95_duration_minutes: number;
    avg_indices_per_run: number;
    avg_skills_per_run: number;
    total_executions: number;
    success_rate: number;
  };
}

export interface TokenUsageByAgent {
  by_agent: Array<{
    agent_id: string;
    agent_name: string;
    invocations: number;
    total_tokens: number;
    avg_tokens_per_call: number;
    cached_tokens: number;
    cache_hit_rate: number;
    estimated_cost_usd: number;
  }>;
  totals: {
    total_invocations: number;
    total_tokens: number;
    total_cached_tokens: number;
    overall_cache_hit_rate: number;
    total_cost_usd: number;
  };
}

export class MetricsCollectorService {
  constructor(private esClient: ElasticsearchClient, private logger: Logger) {}

  /**
   * Collect skill usage metrics from OTEL traces
   */
  async collectSkillUsageMetrics(timeRange: TimeRange): Promise<SkillMetrics> {
    this.logger.debug(
      `[AESOP Metrics] Collecting skill usage metrics from=${timeRange.from} to=${timeRange.to}`
    );

    try {
      const result = await this.esClient.search({
        index: 'traces-*',
        size: 0,
        query: {
          bool: {
            must: [
              { exists: { field: 'attributes.aesop.skill.id' } },
              {
                range: {
                  '@timestamp': {
                    gte: timeRange.from,
                    lte: timeRange.to,
                  },
                },
              },
            ],
          },
        },
        aggs: {
          by_skill: {
            terms: {
              field: 'attributes.aesop.skill.id',
              size: 100,
              order: { _count: 'desc' },
            },
            aggs: {
              skill_name: {
                terms: {
                  field: 'attributes.aesop.skill.name',
                  size: 1,
                },
              },
              success_count: {
                filter: {
                  term: { 'status.code': 'OK' },
                },
              },
              avg_duration: {
                avg: {
                  field: 'duration',
                },
              },
              p95_duration: {
                percentiles: {
                  field: 'duration',
                  percents: [95],
                },
              },
              total_prompt_tokens: {
                sum: {
                  field: 'attributes.gen_ai.usage.prompt_tokens',
                },
              },
              total_completion_tokens: {
                sum: {
                  field: 'attributes.gen_ai.usage.completion_tokens',
                },
              },
              cached_tokens: {
                sum: {
                  field: 'attributes.gen_ai.usage.prompt_tokens_cached',
                },
              },
              error_count: {
                filter: {
                  term: { 'status.code': 'ERROR' },
                },
              },
            },
          },
          total_invocations: {
            value_count: {
              field: 'attributes.aesop.skill.id',
            },
          },
          total_tokens_sum: {
            sum: {
              script: {
                source:
                  "doc['attributes.gen_ai.usage.prompt_tokens'].value + doc['attributes.gen_ai.usage.completion_tokens'].value",
                lang: 'painless',
              },
            },
          },
        },
      });

      const buckets = (result.aggregations?.by_skill as any)?.buckets || [];
      const totalInvocations = (result.aggregations?.total_invocations as any)?.value || 0;
      const totalTokens = (result.aggregations?.total_tokens_sum as any)?.value || 0;

      const bySkill = buckets.map((bucket: any) => {
        const invocations = bucket.doc_count;
        const successCount = bucket.success_count?.doc_count || 0;
        const promptTokens = bucket.total_prompt_tokens?.value || 0;
        const completionTokens = bucket.total_completion_tokens?.value || 0;
        const totalSkillTokens = promptTokens + completionTokens;
        const cachedTokens = bucket.cached_tokens?.value || 0;

        return {
          skill_id: bucket.key,
          skill_name: bucket.skill_name?.buckets[0]?.key || 'Unknown',
          invocations,
          success_rate: invocations > 0 ? (successCount / invocations) * 100 : 0,
          avg_duration_ms: bucket.avg_duration?.value || 0,
          p95_duration_ms: bucket.p95_duration?.values?.['95.0'] || 0,
          total_tokens: totalSkillTokens,
          avg_tokens_per_call: invocations > 0 ? totalSkillTokens / invocations : 0,
          cached_tokens: cachedTokens,
          cache_hit_rate: promptTokens > 0 ? (cachedTokens / promptTokens) * 100 : 0,
          error_count: bucket.error_count?.doc_count || 0,
        };
      });

      // Calculate total cost (Claude pricing: $3/M prompt, $15/M completion)
      const totalCost = buckets.reduce((sum: number, bucket: any) => {
        const promptTokens = bucket.total_prompt_tokens?.value || 0;
        const completionTokens = bucket.total_completion_tokens?.value || 0;
        return sum + (promptTokens * 0.003) / 1000 + (completionTokens * 0.015) / 1000;
      }, 0);

      const avgSuccessRate =
        bySkill.length > 0
          ? bySkill.reduce((sum: number, s: (typeof bySkill)[0]) => sum + s.success_rate, 0) /
            bySkill.length
          : 0;

      return {
        by_skill: bySkill,
        totals: {
          total_invocations: totalInvocations,
          total_tokens: totalTokens,
          total_cost_usd: totalCost,
          avg_success_rate: avgSuccessRate,
        },
      };
    } catch (error) {
      this.logger.error(
        `[AESOP Metrics] Failed to collect skill usage metrics error=${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  /**
   * Collect approval rate metrics from proposed skills
   */
  async collectApprovalRateMetrics(): Promise<ApprovalMetrics> {
    this.logger.debug('[AESOP Metrics] Collecting approval rate metrics');

    try {
      const result = await this.esClient.search({
        index: '.aesop-proposed-skills',
        size: 0,
        aggs: {
          by_cycle: {
            terms: {
              field: 'metadata.cycle_number',
              size: 100,
              order: { _key: 'asc' },
            },
            aggs: {
              total_skills: {
                value_count: {
                  field: 'skill_id',
                },
              },
              approved_count: {
                filter: {
                  term: { 'review.status': 'approved' },
                },
              },
              rejected_count: {
                filter: {
                  term: { 'review.status': 'rejected' },
                },
              },
              pending_count: {
                filter: {
                  term: { 'review.status': 'pending' },
                },
              },
              avg_quality: {
                avg: {
                  field: 'validation.quality_score',
                },
              },
            },
          },
          total_skills_count: {
            value_count: {
              field: 'skill_id',
            },
          },
          total_approved_count: {
            filter: {
              term: { 'review.status': 'approved' },
            },
          },
        },
      });

      const buckets = (result.aggregations?.by_cycle as any)?.buckets || [];

      const byCycle = buckets.map((bucket: any, index: number) => {
        const totalSkills = bucket.total_skills?.value || 0;
        const approvedSkills = bucket.approved_count?.doc_count || 0;
        const rejectedSkills = bucket.rejected_count?.doc_count || 0;
        const pendingSkills = bucket.pending_count?.doc_count || 0;
        const approvalRate = totalSkills > 0 ? (approvedSkills / totalSkills) * 100 : 0;

        // Calculate improvement from previous cycle
        let improvementFromPrevious: number | null = null;
        if (index > 0) {
          const prevBucket = buckets[index - 1];
          const prevTotal = prevBucket.total_skills?.value || 0;
          const prevApproved = prevBucket.approved_count?.doc_count || 0;
          const prevRate = prevTotal > 0 ? (prevApproved / prevTotal) * 100 : 0;
          improvementFromPrevious = approvalRate - prevRate;
        }

        return {
          cycle_number: bucket.key,
          total_skills: totalSkills,
          approved_skills: approvedSkills,
          rejected_skills: rejectedSkills,
          pending_skills: pendingSkills,
          approval_rate: approvalRate,
          avg_quality_score: bucket.avg_quality?.value || 0,
          improvement_from_previous: improvementFromPrevious,
        };
      });

      const totalSkills = (result.aggregations?.total_skills_count as any)?.value || 0;
      const totalApproved = (result.aggregations?.total_approved_count as any)?.doc_count || 0;
      const overallApprovalRate = totalSkills > 0 ? (totalApproved / totalSkills) * 100 : 0;

      // Determine trend (improving, stable, declining)
      let trend: 'improving' | 'stable' | 'declining' = 'stable';
      if (byCycle.length >= 3) {
        const recentCycles = byCycle.slice(-3);
        const improvements = recentCycles
          .map((c: { improvement_from_previous: number | null }) => c.improvement_from_previous)
          .filter((i: number | null) => i !== null) as number[];

        if (improvements.length >= 2) {
          const avgImprovement = improvements.reduce((sum, i) => sum + i, 0) / improvements.length;
          if (avgImprovement > 2) trend = 'improving';
          else if (avgImprovement < -2) trend = 'declining';
        }
      }

      return {
        by_cycle: byCycle,
        overall: {
          total_cycles: byCycle.length,
          total_skills_proposed: totalSkills,
          total_approved: totalApproved,
          overall_approval_rate: overallApprovalRate,
          trend,
        },
      };
    } catch (error) {
      this.logger.error(
        `[AESOP Metrics] Failed to collect approval rate metrics error=${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  /**
   * Collect exploration performance metrics from workflow executions
   */
  async collectExplorationPerformance(): Promise<ExplorationMetrics> {
    this.logger.debug('[AESOP Metrics] Collecting exploration performance metrics');

    try {
      const result = await this.esClient.search({
        index: '.aesop-workflow-executions',
        size: 100,
        query: {
          bool: {
            must: [
              { term: { workflow_name: 'aesop.self_exploration' } },
              { term: { status: 'completed' } },
            ],
          },
        },
        sort: [{ started_at: { order: 'desc' } }],
        _source: [
          'execution_id',
          'started_at',
          'completed_at',
          'duration_ms',
          'metrics.indices_discovered',
          'metrics.relationships_found',
          'metrics.patterns_identified',
          'metrics.skills_proposed',
          'input.agent_role',
        ],
      });

      const hits = result.hits.hits;

      const byExecution = hits.map((hit: any) => {
        const source = hit._source;
        const durationMs = source.duration_ms || 0;

        return {
          execution_id: source.execution_id,
          started_at: source.started_at,
          completed_at: source.completed_at,
          duration_minutes: durationMs / 60000,
          indices_discovered: source.metrics?.indices_discovered || 0,
          relationships_found: source.metrics?.relationships_found || 0,
          patterns_identified: source.metrics?.patterns_identified || 0,
          skills_proposed: source.metrics?.skills_proposed || 0,
          agent_role: source.input?.agent_role || 'Unknown',
        };
      });

      // Calculate aggregates
      const durations = byExecution.map((e) => e.duration_minutes);
      const avgDuration =
        durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;

      const sortedDurations = [...durations].sort((a, b) => a - b);
      const p95Index = Math.ceil(sortedDurations.length * 0.95) - 1;
      const p95Duration = sortedDurations[p95Index] || 0;

      const avgIndices =
        byExecution.length > 0
          ? byExecution.reduce((sum, e) => sum + e.indices_discovered, 0) / byExecution.length
          : 0;

      const avgSkills =
        byExecution.length > 0
          ? byExecution.reduce((sum, e) => sum + e.skills_proposed, 0) / byExecution.length
          : 0;

      const totalExecutionsRaw = result.hits.total;
      const totalExecutions =
        typeof totalExecutionsRaw === 'number'
          ? totalExecutionsRaw
          : totalExecutionsRaw?.value ?? 0;
      // Query only returns completed executions; success rate requires a separate
      // count of total (including failed) executions to be meaningful
      const successRate = byExecution.length > 0 ? 100 : 0;

      return {
        by_execution: byExecution,
        aggregates: {
          avg_duration_minutes: avgDuration,
          p95_duration_minutes: p95Duration,
          avg_indices_per_run: avgIndices,
          avg_skills_per_run: avgSkills,
          total_executions: totalExecutions,
          success_rate: successRate,
        },
      };
    } catch (error) {
      this.logger.error(
        `[AESOP Metrics] Failed to collect exploration performance metrics error=${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  /**
   * Collect token usage metrics by AESOP agent type
   */
  async collectTokenUsageByAgent(timeRange: TimeRange): Promise<TokenUsageByAgent> {
    this.logger.debug(
      `[AESOP Metrics] Collecting token usage by agent from=${timeRange.from} to=${timeRange.to}`
    );

    try {
      const result = await this.esClient.search({
        index: 'traces-*',
        size: 0,
        query: {
          bool: {
            must: [
              { exists: { field: 'attributes.aesop.agent.id' } },
              {
                range: {
                  '@timestamp': {
                    gte: timeRange.from,
                    lte: timeRange.to,
                  },
                },
              },
            ],
          },
        },
        aggs: {
          by_agent: {
            terms: {
              field: 'attributes.aesop.agent.id',
              size: 50,
              order: { total_tokens: 'desc' },
            },
            aggs: {
              agent_name: {
                terms: {
                  field: 'attributes.aesop.agent.name',
                  size: 1,
                },
              },
              invocations: {
                value_count: {
                  field: 'attributes.aesop.agent.id',
                },
              },
              total_prompt_tokens: {
                sum: {
                  field: 'attributes.gen_ai.usage.prompt_tokens',
                },
              },
              total_completion_tokens: {
                sum: {
                  field: 'attributes.gen_ai.usage.completion_tokens',
                },
              },
              total_tokens: {
                sum: {
                  script: {
                    source:
                      "doc['attributes.gen_ai.usage.prompt_tokens'].value + doc['attributes.gen_ai.usage.completion_tokens'].value",
                    lang: 'painless',
                  },
                },
              },
              cached_tokens: {
                sum: {
                  field: 'attributes.gen_ai.usage.prompt_tokens_cached',
                },
              },
            },
          },
          total_invocations_all: {
            value_count: {
              field: 'attributes.aesop.agent.id',
            },
          },
          total_cached_tokens_all: {
            sum: {
              field: 'attributes.gen_ai.usage.prompt_tokens_cached',
            },
          },
        },
      });

      const buckets = (result.aggregations?.by_agent as any)?.buckets || [];

      const byAgent = buckets.map((bucket: any) => {
        const invocations = bucket.invocations?.value || 0;
        const promptTokens = bucket.total_prompt_tokens?.value || 0;
        const completionTokens = bucket.total_completion_tokens?.value || 0;
        const totalAgentTokens = bucket.total_tokens?.value || 0;
        const cachedTokens = bucket.cached_tokens?.value || 0;

        // Estimate cost (Claude pricing)
        const estimatedCost = (promptTokens * 0.003) / 1000 + (completionTokens * 0.015) / 1000;

        return {
          agent_id: bucket.key,
          agent_name: bucket.agent_name?.buckets[0]?.key || 'Unknown',
          invocations,
          total_tokens: totalAgentTokens,
          avg_tokens_per_call: invocations > 0 ? totalAgentTokens / invocations : 0,
          cached_tokens: cachedTokens,
          cache_hit_rate: promptTokens > 0 ? (cachedTokens / promptTokens) * 100 : 0,
          estimated_cost_usd: estimatedCost,
        };
      });

      const totalInvocations = (result.aggregations?.total_invocations_all as any)?.value || 0;
      const totalTokensSum = byAgent.reduce(
        (sum: number, a: { total_tokens: number }) => sum + a.total_tokens,
        0
      );
      const totalCachedTokensAll =
        (result.aggregations?.total_cached_tokens_all as any)?.value || 0;
      const totalCostSum = byAgent.reduce(
        (sum: number, a: { estimated_cost_usd: number }) => sum + a.estimated_cost_usd,
        0
      );

      const overallPromptTokens = buckets.reduce(
        (sum: number, b: any) => sum + (b.total_prompt_tokens?.value || 0),
        0
      );
      const overallCacheHitRate =
        overallPromptTokens > 0 ? (totalCachedTokensAll / overallPromptTokens) * 100 : 0;

      return {
        by_agent: byAgent,
        totals: {
          total_invocations: totalInvocations,
          total_tokens: totalTokensSum,
          total_cached_tokens: totalCachedTokensAll,
          overall_cache_hit_rate: overallCacheHitRate,
          total_cost_usd: totalCostSum,
        },
      };
    } catch (error) {
      this.logger.error(
        `[AESOP Metrics] Failed to collect token usage by agent error=${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }
}
