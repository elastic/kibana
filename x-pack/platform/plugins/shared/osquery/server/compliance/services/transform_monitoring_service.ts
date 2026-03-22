/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';

interface TransformHealth {
  transformId: string;
  state: string;
  isHealthy: boolean;
  lastCheckpoint: Date | null;
  documentsProcessed: number;
  processingTime: number;
  searchFailures: number;
  indexFailures: number;
  issues: string[];
}

interface TransformMonitoringConfig {
  checkInterval: string;
  maxProcessingTime: number;
  maxFailures: number;
  alertOnFailure: boolean;
}

const TRANSFORM_MONITORING_TASK_TYPE = 'endpoint-compliance:transform-monitoring';
const TRANSFORM_MONITORING_TASK_ID = 'endpoint-compliance-transform-monitoring-task';

/**
 * Service for monitoring compliance transform health and performance.
 * Runs periodic health checks and generates alerts for transform issues.
 */
export class ComplianceTransformMonitoringService {
  private readonly defaultConfig: TransformMonitoringConfig = {
    checkInterval: '2m',
    maxProcessingTime: 60000, // 60 seconds
    maxFailures: 5,
    alertOnFailure: true,
  };

  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly taskManager: TaskManagerStartContract,
    private readonly logger: Logger,
    private readonly config: Partial<TransformMonitoringConfig> = {}
  ) {}

  /**
   * Starts transform monitoring by registering a recurring task
   */
  async startMonitoring(transformIds: string[]): Promise<void> {
    const monitoringConfig = { ...this.defaultConfig, ...this.config };

    try {
      await this.taskManager.ensureScheduled({
        id: TRANSFORM_MONITORING_TASK_ID,
        taskType: TRANSFORM_MONITORING_TASK_TYPE,
        schedule: {
          interval: monitoringConfig.checkInterval,
        },
        params: {
          transformIds,
          config: monitoringConfig,
        },
        state: {
          lastRun: new Date(),
          consecutiveFailures: 0,
        },
        scope: ['osquery'],
      });

      this.logger.info(
        `Started transform monitoring for ${transformIds.length} transforms with interval: ${monitoringConfig.checkInterval}`
      );
    } catch (error) {
      this.logger.error('Failed to start transform monitoring:', error);
      throw new Error(`Transform monitoring start failed: ${error.message}`);
    }
  }

  /**
   * Stops transform monitoring by removing the recurring task
   */
  async stopMonitoring(): Promise<void> {
    try {
      await this.taskManager.removeIfExists(TRANSFORM_MONITORING_TASK_ID);
      this.logger.info('Stopped transform monitoring');
    } catch (error) {
      this.logger.error('Failed to stop transform monitoring:', error);
      throw new Error(`Transform monitoring stop failed: ${error.message}`);
    }
  }

  /**
   * Performs health check for a specific transform
   */
  async checkTransformHealth(transformId: string): Promise<TransformHealth> {
    try {
      const stats = await this.esClient.transform.getTransformStats({
        transform_id: transformId,
      });

      const transformStats = stats.transforms?.[0];
      if (!transformStats) {
        throw new Error(`Transform ${transformId} not found`);
      }

      const issues: string[] = [];
      const state = transformStats.state;
      const lastCheckpoint = transformStats.checkpointing?.last?.time_upper_bound
        ? new Date(transformStats.checkpointing.last.time_upper_bound)
        : null;
      
      const documentsProcessed = transformStats.stats?.documents_processed || 0;
      const processingTime = transformStats.stats?.processing_time_in_ms || 0;
      const searchFailures = transformStats.stats?.search_failures || 0;
      const indexFailures = transformStats.stats?.index_failures || 0;

      // Check if transform is running
      if (state !== 'started') {
        issues.push(`Transform is not running (state: ${state})`);
      }

      // Check for failures
      if (searchFailures > this.defaultConfig.maxFailures) {
        issues.push(`High search failure count: ${searchFailures}`);
      }

      if (indexFailures > this.defaultConfig.maxFailures) {
        issues.push(`High index failure count: ${indexFailures}`);
      }

      // Check processing time
      if (processingTime > this.defaultConfig.maxProcessingTime) {
        issues.push(`High processing time: ${processingTime}ms`);
      }

      // Check checkpoint freshness
      if (lastCheckpoint) {
        const checkpointAge = Date.now() - lastCheckpoint.getTime();
        const maxCheckpointAge = 10 * 60 * 1000; // 10 minutes
        if (checkpointAge > maxCheckpointAge) {
          issues.push(`Stale checkpoint: ${Math.round(checkpointAge / 60000)} minutes old`);
        }
      }

      // Check for transform errors
      if (transformStats.reason) {
        issues.push(`Transform error: ${transformStats.reason}`);
      }

      return {
        transformId,
        state,
        isHealthy: issues.length === 0,
        lastCheckpoint,
        documentsProcessed,
        processingTime,
        searchFailures,
        indexFailures,
        issues,
      };
    } catch (error) {
      this.logger.error(`Failed to check health for transform ${transformId}:`, error);
      return {
        transformId,
        state: 'unknown',
        isHealthy: false,
        lastCheckpoint: null,
        documentsProcessed: 0,
        processingTime: 0,
        searchFailures: 0,
        indexFailures: 0,
        issues: [`Health check failed: ${error.message}`],
      };
    }
  }

  /**
   * Performs health checks for multiple transforms
   */
  async checkMultipleTransformHealth(transformIds: string[]): Promise<TransformHealth[]> {
    const healthChecks = await Promise.allSettled(
      transformIds.map((id) => this.checkTransformHealth(id))
    );

    return healthChecks.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        const transformId = transformIds[index];
        this.logger.error(`Health check failed for transform ${transformId}:`, result.reason);
        return {
          transformId,
          state: 'error',
          isHealthy: false,
          lastCheckpoint: null,
          documentsProcessed: 0,
          processingTime: 0,
          searchFailures: 0,
          indexFailures: 0,
          issues: [`Health check error: ${result.reason.message}`],
        };
      }
    });
  }

  /**
   * Generates alerts for unhealthy transforms
   */
  async generateAlerts(transformHealthResults: TransformHealth[]): Promise<void> {
    const unhealthyTransforms = transformHealthResults.filter((result) => !result.isHealthy);

    if (unhealthyTransforms.length === 0) {
      this.logger.debug('All transforms are healthy, no alerts generated');
      return;
    }

    for (const transform of unhealthyTransforms) {
      const alertMessage = this.formatAlertMessage(transform);
      
      // Log the alert (in production, this would integrate with alerting framework)
      this.logger.warn(`TRANSFORM ALERT: ${alertMessage}`, {
        transformId: transform.transformId,
        state: transform.state,
        issues: transform.issues,
        documentsProcessed: transform.documentsProcessed,
        processingTime: transform.processingTime,
        searchFailures: transform.searchFailures,
        indexFailures: transform.indexFailures,
      });

      // TODO: Integrate with Kibana Alerting framework for actual alert delivery
      // This could send notifications via email, Slack, webhook, etc.
      await this.sendAlert(transform);
    }
  }

  /**
   * Formats a human-readable alert message for a transform health issue
   */
  private formatAlertMessage(transform: TransformHealth): string {
    const issuesText = transform.issues.join(', ');
    return `Transform '${transform.transformId}' is unhealthy (state: ${transform.state}). Issues: ${issuesText}`;
  }

  /**
   * Placeholder for sending actual alerts (email, Slack, etc.)
   * In production, this would integrate with Kibana's alerting framework
   */
  private async sendAlert(transform: TransformHealth): Promise<void> {
    // Placeholder for alert delivery
    // In a real implementation, this would:
    // 1. Create or update an alert document
    // 2. Send notifications via configured channels
    // 3. Track alert state to prevent spam
    
    this.logger.debug(`Alert would be sent for transform: ${transform.transformId}`);
  }

  /**
   * Gets monitoring task status and statistics
   */
  async getMonitoringStatus(): Promise<{
    isRunning: boolean;
    lastRun: Date | null;
    nextRun: Date | null;
    consecutiveFailures: number;
    task: any;
  }> {
    try {
      const task = await this.taskManager.get(TRANSFORM_MONITORING_TASK_ID);
      
      return {
        isRunning: task.status === 'running',
        lastRun: task.state?.lastRun ? new Date(task.state.lastRun) : null,
        nextRun: task.runAt ? new Date(task.runAt) : null,
        consecutiveFailures: task.state?.consecutiveFailures || 0,
        task,
      };
    } catch (error) {
      if (error.type === 'task_not_found_exception') {
        return {
          isRunning: false,
          lastRun: null,
          nextRun: null,
          consecutiveFailures: 0,
          task: null,
        };
      }
      throw error;
    }
  }

  /**
   * Manually triggers a monitoring check (for testing/debugging)
   */
  async runManualCheck(transformIds: string[]): Promise<TransformHealth[]> {
    this.logger.info(`Running manual transform health check for ${transformIds.length} transforms`);
    
    const healthResults = await this.checkMultipleTransformHealth(transformIds);
    await this.generateAlerts(healthResults);
    
    return healthResults;
  }
}

/**
 * Task manager task definition for transform monitoring
 */
export const transformMonitoringTaskDefinition = {
  title: 'Endpoint Compliance Transform Monitoring',
  type: TRANSFORM_MONITORING_TASK_TYPE,
  createTaskRunner: (context: any) => {
    return {
      async run({ params, state }: any) {
        const { transformIds, config } = params;
        const monitoringService = new ComplianceTransformMonitoringService(
          context.esClient,
          context.taskManager,
          context.logger,
          config
        );

        try {
          const healthResults = await monitoringService.checkMultipleTransformHealth(transformIds);
          await monitoringService.generateAlerts(healthResults);

          return {
            state: {
              lastRun: new Date(),
              consecutiveFailures: 0,
              lastHealthCheck: {
                timestamp: new Date(),
                results: healthResults.map((result) => ({
                  transformId: result.transformId,
                  isHealthy: result.isHealthy,
                  issues: result.issues,
                })),
              },
            },
          };
        } catch (error) {
          context.logger.error('Transform monitoring task failed:', error);
          
          return {
            state: {
              lastRun: new Date(),
              consecutiveFailures: (state.consecutiveFailures || 0) + 1,
              lastError: {
                timestamp: new Date(),
                message: error.message,
              },
            },
          };
        }
      },
    };
  },
};