/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';

export interface MonitoringMetrics {
  transform: {
    state: string;
    health: string;
    documents_processed: number;
    processing_lag_ms: number;
    last_checkpoint: string | null;
  };
  findings: {
    total_count: number;
    ingestion_rate_per_minute: number;
    latest_timestamp: string | null;
  };
  scores: {
    overall_compliance_score: number;
    total_hosts: number;
    total_benchmarks: number;
  };
  fleet: {
    total_package_policies: number;
    total_agents_with_packs: number;
  };
  timestamp: string;
}

export const COMPLIANCE_MONITORING_TASK_TYPE = 'osquery:compliance_monitoring';

/**
 * Continuous monitoring service for compliance deployment health
 * Runs as scheduled task, tracks metrics, alerts on issues
 */
export class DeploymentMonitoringService {
  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly taskManager: TaskManagerStartContract | undefined,
    private readonly logger: Logger
  ) {}

  /**
   * Collect current monitoring metrics
   */
  async collectMetrics(): Promise<MonitoringMetrics> {
    const [transform, findings, scores] = await Promise.all([
      this.getTransformMetrics(),
      this.getFindingsMetrics(),
      this.getScoresMetrics(),
    ]);

    return {
      transform,
      findings,
      scores,
      fleet: {
        total_package_policies: 0, // TODO: Query Fleet API
        total_agents_with_packs: 0,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get transform health metrics
   */
  private async getTransformMetrics() {
    try {
      const stats = await this.esClient.transform.getTransformStats({
        transform_id: 'compliance-findings-latest',
      });

      if (stats.transforms.length === 0) {
        return {
          state: 'not_found',
          health: 'red',
          documents_processed: 0,
          processing_lag_ms: 0,
          last_checkpoint: null,
        };
      }

      const transform = stats.transforms[0];

      return {
        state: transform.state,
        health: transform.state === 'started' ? 'green' : transform.state === 'stopped' ? 'yellow' : 'red',
        documents_processed: transform.stats.documents_processed,
        processing_lag_ms: this.calculateProcessingLag(transform),
        last_checkpoint: transform.checkpointing.last?.timestamp_millis
          ? new Date(transform.checkpointing.last.timestamp_millis).toISOString()
          : null,
      };
    } catch (error) {
      this.logger.error(`Failed to get transform metrics: ${error.message}`);
      return {
        state: 'error',
        health: 'red',
        documents_processed: 0,
        processing_lag_ms: 0,
        last_checkpoint: null,
      };
    }
  }

  /**
   * Calculate transform processing lag
   */
  private calculateProcessingLag(transformStats: any): number {
    if (!transformStats.checkpointing.last?.timestamp_millis) {
      return 0;
    }

    const lastCheckpoint = transformStats.checkpointing.last.timestamp_millis;
    const now = Date.now();

    return now - lastCheckpoint;
  }

  /**
   * Get findings ingestion metrics
   */
  private async getFindingsMetrics() {
    try {
      const [totalCount, recentDocs] = await Promise.all([
        this.esClient.count({ index: 'compliance-findings-latest-*' }),
        this.esClient.search({
          index: 'compliance-findings-*',
          body: {
            query: {
              range: {
                '@timestamp': {
                  gte: 'now-1m',
                },
              },
            },
            size: 0,
            aggs: {
              latest: {
                max: {
                  field: '@timestamp',
                },
              },
            },
          },
        }),
      ]);

      return {
        total_count: totalCount.count,
        ingestion_rate_per_minute: recentDocs.hits.total.value,
        latest_timestamp: (recentDocs.aggregations?.latest as any)?.value_as_string || null,
      };
    } catch (error) {
      this.logger.error(`Failed to get findings metrics: ${error.message}`);
      return {
        total_count: 0,
        ingestion_rate_per_minute: 0,
        latest_timestamp: null,
      };
    }
  }

  /**
   * Get compliance scores metrics
   */
  private async getScoresMetrics() {
    try {
      const scores = await this.esClient.search({
        index: 'compliance-findings-latest-*',
        body: {
          size: 0,
          aggs: {
            total_passed: {
              filter: {
                term: { 'result.evaluation': 'passed' },
              },
            },
            total_failed: {
              filter: {
                term: { 'result.evaluation': 'failed' },
              },
            },
            unique_hosts: {
              cardinality: {
                field: 'host.id',
              },
            },
            unique_benchmarks: {
              cardinality: {
                field: 'rule.benchmark.id.keyword',
              },
            },
          },
        },
      });

      const aggs = scores.aggregations;
      const totalPassed = (aggs?.total_passed as any)?.doc_count || 0;
      const totalFailed = (aggs?.total_failed as any)?.doc_count || 0;
      const total = totalPassed + totalFailed;

      const complianceScore = total > 0 ? (totalPassed / total) * 100 : 0;

      return {
        overall_compliance_score: Math.round(complianceScore * 10) / 10,
        total_hosts: (aggs?.unique_hosts as any)?.value || 0,
        total_benchmarks: (aggs?.unique_benchmarks as any)?.value || 0,
      };
    } catch (error) {
      this.logger.error(`Failed to get scores metrics: ${error.message}`);
      return {
        overall_compliance_score: 0,
        total_hosts: 0,
        total_benchmarks: 0,
      };
    }
  }

  /**
   * Check if monitoring is needed (degraded or unhealthy state)
   */
  async shouldAlert(): Promise<{ alert: boolean; reasons: string[] }> {
    const metrics = await this.collectMetrics();
    const reasons: string[] = [];

    // Check transform health
    if (metrics.transform.health === 'red') {
      reasons.push(`Transform is in failed state: ${metrics.transform.state}`);
    }

    // Check processing lag
    const lagMinutes = metrics.transform.processing_lag_ms / 60000;
    if (lagMinutes > 15) {
      reasons.push(`Transform processing lag is ${Math.round(lagMinutes)} minutes (>15min threshold)`);
    }

    // Check findings ingestion
    if (metrics.findings.total_count > 0 && metrics.findings.ingestion_rate_per_minute === 0) {
      const latestAge = metrics.findings.latest_timestamp
        ? (Date.now() - new Date(metrics.findings.latest_timestamp).getTime()) / 60000
        : Infinity;

      if (latestAge > 120) {
        // No findings for 2 hours
        reasons.push(`No new findings for ${Math.round(latestAge)} minutes (>120min threshold)`);
      }
    }

    // Check compliance score drop
    // (Would need historical comparison - placeholder for now)

    return {
      alert: reasons.length > 0,
      reasons,
    };
  }

  /**
   * Register monitoring task with Task Manager
   */
  async registerMonitoringTask() {
    if (!this.taskManager) {
      this.logger.warn('Task Manager not available - monitoring task not registered');
      return;
    }

    await this.taskManager.ensureScheduled({
      id: COMPLIANCE_MONITORING_TASK_TYPE,
      taskType: COMPLIANCE_MONITORING_TASK_TYPE,
      schedule: {
        interval: '5m', // Run every 5 minutes
      },
      state: {},
      params: {},
    });

    this.logger.info('Compliance monitoring task registered (runs every 5 minutes)');
  }
}

/**
 * Task Manager task definition for monitoring
 */
export function createMonitoringTaskDefinition(
  esClient: ElasticsearchClient,
  logger: Logger
) {
  return {
    title: 'Compliance Monitoring Health Checks',
    timeout: '1m',
    maxAttempts: 3,
    createTaskRunner: () => {
      return {
        async run() {
          const monitoring = new DeploymentMonitoringService(esClient, undefined, logger);

          // Collect metrics
          const metrics = await monitoring.collectMetrics();

          logger.debug('Compliance monitoring metrics', metrics);

          // Check if alert needed
          const { alert, reasons } = await monitoring.shouldAlert();

          if (alert) {
            logger.warn('Compliance monitoring alert triggered', { reasons });

            // TODO: Send alerts via alerting framework
            // For now, just log
          }

          return { state: { lastRun: new Date().toISOString(), metrics } };
        },
      };
    },
  };
}
