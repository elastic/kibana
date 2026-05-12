/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  EVALUATIONS_INDEX_PATTERN,
  EVALUATIONS_WRITE_INDEX,
  TRACES_INDEX_PATTERN,
} from '@kbn/evals-common';
import type { SkillPerformanceMetrics, SkillAlert } from '../../../common/monitoring_types';

export type { SkillPerformanceMetrics, SkillAlert };

export interface DriftDetectionConfig {
  threshold: number;
  evaluationInterval: string;
  enabled: boolean;
}

const DEFAULT_DRIFT_CONFIG: DriftDetectionConfig = {
  threshold: 0.1,
  evaluationInterval: '24h',
  enabled: true,
};

interface UsageAggregations {
  total_invocations: { value: number };
  unique_agents: { value: number };
  unique_users: { value: number };
  per_day: {
    buckets: Array<{ key_as_string: string; doc_count: number }>;
  };
}

interface FeedbackAggregations {
  feedback_breakdown: {
    buckets: Array<{ key: string; doc_count: number }>;
  };
}

interface EvaluationHitSource {
  '@timestamp'?: string;
  score?: number;
  metadata?: {
    skill_id?: string;
    source?: string;
  };
}

export class SkillMonitoringService {
  constructor(private readonly logger: Logger) {}

  async getSkillMetrics(
    skillId: string,
    skillName: string,
    deployedAt: string,
    period: { from: string; to: string },
    esClient: ElasticsearchClient
  ): Promise<SkillPerformanceMetrics> {
    const [usage, feedback, qualityData] = await Promise.all([
      this.queryUsageMetrics(skillId, period, esClient),
      this.queryFeedbackMetrics(skillId, period, esClient),
      this.queryQualityMetrics(skillId, esClient),
    ]);

    const alerts = this.generateAlerts(skillId, usage, feedback, qualityData);

    return {
      skill_id: skillId,
      skill_name: skillName,
      deployed_at: deployedAt,
      period,
      usage,
      success: feedback,
      quality: qualityData,
      alerts,
    };
  }

  async detectDrift(
    skillId: string,
    deploymentScore: number,
    esClient: ElasticsearchClient,
    config: DriftDetectionConfig = DEFAULT_DRIFT_CONFIG
  ): Promise<{ driftDetected: boolean; currentScore: number | null; delta: number | null }> {
    if (!config.enabled) {
      return { driftDetected: false, currentScore: null, delta: null };
    }

    const latestEvaluation = await this.getLatestEvaluationScore(skillId, esClient);

    if (latestEvaluation === null) {
      return { driftDetected: false, currentScore: null, delta: null };
    }

    const delta = latestEvaluation - deploymentScore;
    const driftDetected = delta < -config.threshold;

    return { driftDetected, currentScore: latestEvaluation, delta };
  }

  async reEvaluateSkill(
    skillId: string,
    datasetId: string,
    evaluatorNames: string[],
    connectorId: string,
    dependencies: {
      evaluatorRegistry: { get: (name: string) => unknown };
      esClient: ElasticsearchClient;
    }
  ): Promise<{ score: number; evaluatorResults: unknown[] }> {
    const { createEvaluationRunner } = await import('../evaluation_engine/evaluation_runner');

    const runner = createEvaluationRunner(
      dependencies.evaluatorRegistry as Parameters<typeof createEvaluationRunner>[0],
      this.logger
    );

    const datasetResponse = await dependencies.esClient.search({
      index: EVALUATIONS_INDEX_PATTERN,
      query: {
        bool: {
          must: [{ term: { 'metadata.dataset_id': datasetId } }],
        },
      },
      size: 100,
    });

    const items = datasetResponse.hits.hits.map((hit) => {
      const source = hit._source as Record<string, unknown>;
      return {
        input: (source.input as Record<string, unknown>) ?? {},
        output: source.output,
        expected: source.expected,
      };
    });

    if (items.length === 0) {
      return { score: 0, evaluatorResults: [] };
    }

    const result = await runner.run({
      items,
      evaluatorNames,
      connectorId,
      persist: true,
      datasetId,
    });

    const totalScore =
      result.results.reduce((sum, r) => {
        const scoredResults = r.evaluatorResults.filter(
          (er): er is typeof er & { score: number } => er.score != null
        );
        if (scoredResults.length === 0) return sum;
        const avgScore = scoredResults.reduce((s, er) => s + er.score, 0) / scoredResults.length;
        return sum + avgScore;
      }, 0) / result.results.length;

    await dependencies.esClient.index({
      index: EVALUATIONS_WRITE_INDEX,
      document: {
        '@timestamp': new Date().toISOString(),
        score: totalScore,
        metadata: {
          skill_id: skillId,
          dataset_id: datasetId,
          source: 'drift-check',
          evaluators: evaluatorNames,
        },
      },
    });

    return {
      score: totalScore,
      evaluatorResults: result.results,
    };
  }

  // NOTE: Monitoring metrics query traces-* which is cross-space by design.
  // OTel traces do not carry Kibana space context. Access control is enforced
  // at the skill-level: only users who can read the skill SO can access its metrics.
  private async queryUsageMetrics(
    skillId: string,
    period: { from: string; to: string },
    esClient: ElasticsearchClient
  ): Promise<SkillPerformanceMetrics['usage']> {
    try {
      const response = await esClient.search<unknown, UsageAggregations>({
        index: TRACES_INDEX_PATTERN,
        size: 0,
        query: {
          bool: {
            must: [
              { term: { 'attributes.skill_id': skillId } },
              { range: { '@timestamp': { gte: period.from, lte: period.to } } },
            ],
          },
        },
        aggs: {
          total_invocations: { value_count: { field: 'span_id' } },
          unique_agents: { cardinality: { field: 'attributes.agent_id' } },
          unique_users: { cardinality: { field: 'attributes.user_id' } },
          per_day: { date_histogram: { field: '@timestamp', calendar_interval: 'day' } },
        },
      });

      const aggs = response.aggregations;

      return {
        total_invocations: aggs?.total_invocations?.value ?? 0,
        unique_agents: aggs?.unique_agents?.value ?? 0,
        unique_users: aggs?.unique_users?.value ?? 0,
        invocations_per_day:
          aggs?.per_day?.buckets?.map((bucket) => ({
            date: bucket.key_as_string,
            count: bucket.doc_count,
          })) ?? [],
      };
    } catch (error) {
      this.logger.error(`Failed to query usage metrics for skill ${skillId}: ${error}`);
      return {
        total_invocations: 0,
        unique_agents: 0,
        unique_users: 0,
        invocations_per_day: [],
      };
    }
  }

  private async queryFeedbackMetrics(
    skillId: string,
    period: { from: string; to: string },
    esClient: ElasticsearchClient
  ): Promise<SkillPerformanceMetrics['success']> {
    try {
      const response = await esClient.search<unknown, FeedbackAggregations>({
        index: TRACES_INDEX_PATTERN,
        size: 0,
        query: {
          bool: {
            must: [
              { term: { 'attributes.skill_id': skillId } },
              { exists: { field: 'attributes.user_feedback' } },
              { range: { '@timestamp': { gte: period.from, lte: period.to } } },
            ],
          },
        },
        aggs: {
          feedback_breakdown: {
            terms: { field: 'attributes.user_feedback' },
          },
        },
      });

      const buckets = response.aggregations?.feedback_breakdown?.buckets ?? [];
      let positive = 0;
      let negative = 0;
      let unknown = 0;

      for (const bucket of buckets) {
        if (bucket.key === 'positive') {
          positive = bucket.doc_count;
        } else if (bucket.key === 'negative') {
          negative = bucket.doc_count;
        } else {
          unknown += bucket.doc_count;
        }
      }

      const total = positive + negative + unknown;
      const successRate = total > 0 ? positive / total : 0;

      return {
        success_rate: successRate,
        positive_feedback: positive,
        negative_feedback: negative,
        unknown_feedback: unknown,
      };
    } catch (error) {
      this.logger.error(`Failed to query feedback metrics for skill ${skillId}: ${error}`);
      return {
        success_rate: 0,
        positive_feedback: 0,
        negative_feedback: 0,
        unknown_feedback: 0,
      };
    }
  }

  private async queryQualityMetrics(
    skillId: string,
    esClient: ElasticsearchClient
  ): Promise<SkillPerformanceMetrics['quality']> {
    try {
      const deploymentScoreResponse = await esClient.search<EvaluationHitSource>({
        index: EVALUATIONS_INDEX_PATTERN,
        size: 1,
        query: {
          bool: {
            must: [
              { term: { 'metadata.skill_id': skillId } },
              { term: { 'metadata.source': 'deployment' } },
            ],
          },
        },
        sort: [{ '@timestamp': { order: 'desc' } }],
      });

      const deploymentHit = deploymentScoreResponse.hits.hits[0]?._source;
      const deploymentScore = deploymentHit?.score ?? 0;

      const latestScore = await this.getLatestEvaluationScore(skillId, esClient);
      const delta = latestScore !== null ? latestScore - deploymentScore : null;
      const driftDetected = delta !== null && delta < -DEFAULT_DRIFT_CONFIG.threshold;

      const latestEvalResponse = await esClient.search<EvaluationHitSource>({
        index: EVALUATIONS_INDEX_PATTERN,
        size: 1,
        query: {
          bool: {
            must: [{ term: { 'metadata.skill_id': skillId } }],
          },
        },
        sort: [{ '@timestamp': { order: 'desc' } }],
      });

      const latestEvalHit = latestEvalResponse.hits.hits[0]?._source;
      const lastEvaluatedAt = latestEvalHit?.['@timestamp'] ?? null;

      return {
        deployment_score: deploymentScore,
        current_score: latestScore,
        score_delta: delta,
        drift_detected: driftDetected,
        last_evaluated_at: lastEvaluatedAt,
      };
    } catch (error) {
      this.logger.error(`Failed to query quality metrics for skill ${skillId}: ${error}`);
      return {
        deployment_score: 0,
        current_score: null,
        score_delta: null,
        drift_detected: false,
        last_evaluated_at: null,
      };
    }
  }

  private async getLatestEvaluationScore(
    skillId: string,
    esClient: ElasticsearchClient
  ): Promise<number | null> {
    const response = await esClient.search<EvaluationHitSource>({
      index: EVALUATIONS_INDEX_PATTERN,
      size: 1,
      query: {
        bool: {
          must: [
            { term: { 'metadata.skill_id': skillId } },
            { term: { 'metadata.source': 'drift-check' } },
          ],
        },
      },
      sort: [{ '@timestamp': { order: 'desc' } }],
    });

    const hit = response.hits.hits[0]?._source;
    return hit?.score ?? null;
  }

  private generateAlerts(
    skillId: string,
    usage: SkillPerformanceMetrics['usage'],
    feedback: SkillPerformanceMetrics['success'],
    quality: SkillPerformanceMetrics['quality']
  ): SkillAlert[] {
    const alerts: SkillAlert[] = [];
    const now = new Date().toISOString();

    if (quality.drift_detected) {
      alerts.push({
        id: uuidv4(),
        type: 'drift',
        severity: 'critical',
        message: `Score drift detected for skill ${skillId}: deployment score ${quality.deployment_score.toFixed(
          2
        )}, current score ${quality.current_score?.toFixed(2) ?? 'N/A'} (delta: ${
          quality.score_delta?.toFixed(2) ?? 'N/A'
        })`,
        created_at: now,
        acknowledged: false,
      });
    }

    if (
      feedback.success_rate < 0.5 &&
      feedback.positive_feedback + feedback.negative_feedback > 0
    ) {
      alerts.push({
        id: uuidv4(),
        type: 'low_success_rate',
        severity: feedback.success_rate < 0.3 ? 'critical' : 'warning',
        message: `Low success rate for skill ${skillId}: ${(feedback.success_rate * 100).toFixed(
          1
        )}%`,
        created_at: now,
        acknowledged: false,
      });
    }

    if (usage.total_invocations === 0) {
      alerts.push({
        id: uuidv4(),
        type: 'low_usage',
        severity: 'warning',
        message: `No invocations recorded for skill ${skillId} during the selected period`,
        created_at: now,
        acknowledged: false,
      });
    }

    const recentDays = usage.invocations_per_day.slice(-3);
    if (recentDays.length >= 2) {
      const previousCount = recentDays[recentDays.length - 2].count;
      const latestCount = recentDays[recentDays.length - 1].count;
      if (previousCount > 0 && latestCount / previousCount > 3) {
        alerts.push({
          id: uuidv4(),
          type: 'error_spike',
          severity: 'warning',
          message: `Unusual activity spike for skill ${skillId}: ${latestCount} invocations (${(
            (latestCount / previousCount - 1) *
            100
          ).toFixed(0)}% increase)`,
          created_at: now,
          acknowledged: false,
        });
      }
    }

    return alerts;
  }
}
