/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';

interface AgentExecutionMetrics {
  agentId: string;
  hostname: string;
  status: 'online' | 'offline' | 'degraded' | 'error';
  lastSeen: string;
  osqueryExecution: {
    totalQueries: number;
    successfulQueries: number;
    failedQueries: number;
    avgExecutionTime: number;
    maxExecutionTime: number;
    lastQueryTime: string;
  };
  compliance: {
    packagesDeployed: number;
    findingsGenerated: number;
    lastFindingTime: string;
    complianceScore: number;
  };
  performance: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkLatency: number;
  };
  errors: Array<{
    timestamp: string;
    queryName: string;
    errorType: 'timeout' | 'permission_denied' | 'syntax_error' | 'system_error';
    errorMessage: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  alerts: Array<{
    id: string;
    type: 'performance' | 'availability' | 'compliance' | 'error_rate';
    severity: 'info' | 'warning' | 'critical';
    message: string;
    timestamp: string;
    acknowledged: boolean;
  }>;
}

interface QueryExecutionResult {
  queryName: string;
  agentId: string;
  hostname: string;
  executionTime: number;
  resultCount: number;
  status: 'success' | 'error' | 'timeout';
  errorMessage?: string;
  timestamp: string;
  packName?: string;
  benchmarkId?: string;
}

interface MonitoringAlert {
  id: string;
  type: 'agent_offline' | 'high_error_rate' | 'performance_degradation' | 'compliance_failure' | 'query_timeout';
  severity: 'info' | 'warning' | 'critical';
  agentId?: string;
  hostname?: string;
  message: string;
  details: Record<string, any>;
  timestamp: string;
  acknowledged: boolean;
  resolvedAt?: string;
}

interface MonitoringThresholds {
  agentOfflineThreshold: number; // minutes
  errorRateThreshold: number; // percentage
  executionTimeThreshold: number; // milliseconds
  cpuUsageThreshold: number; // percentage
  memoryUsageThreshold: number; // percentage
  complianceScoreThreshold: number; // percentage
}

const DEFAULT_THRESHOLDS: MonitoringThresholds = {
  agentOfflineThreshold: 5, // 5 minutes
  errorRateThreshold: 10, // 10%
  executionTimeThreshold: 30000, // 30 seconds
  cpuUsageThreshold: 80, // 80%
  memoryUsageThreshold: 85, // 85%
  complianceScoreThreshold: 70, // 70%
};

const MONITORING_TASK_TYPE = 'endpoint-compliance:agent-execution-monitoring';
const MONITORING_TASK_ID = 'endpoint-compliance-agent-monitoring';

/**
 * Service for monitoring osquery agent execution, query results, and performance.
 * Provides real-time metrics, alerting, and automated issue detection.
 */
export class AgentExecutionMonitoringService {
  private readonly alerts = new Map<string, MonitoringAlert>();
  private thresholds: MonitoringThresholds = DEFAULT_THRESHOLDS;

  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly logger: Logger,
    private readonly taskManager: TaskManagerSetupContract | TaskManagerStartContract
  ) {}

  /**
   * Starts the monitoring service with task scheduling
   */
  async startMonitoring(options: {
    interval: string; // '5m', '1h', etc.
    enabled: boolean;
    thresholds?: Partial<MonitoringThresholds>;
  }): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      if (options.thresholds) {
        this.thresholds = { ...DEFAULT_THRESHOLDS, ...options.thresholds };
      }

      if (!options.enabled) {
        this.logger.info('Agent execution monitoring is disabled');
        return { success: true };
      }

      // Register monitoring task
      this.taskManager.registerTaskDefinitions({
        [MONITORING_TASK_TYPE]: {
          title: 'Endpoint Compliance Agent Execution Monitoring',
          description: 'Monitors osquery agent execution and generates alerts',
          timeout: '5m',
          maxAttempts: 3,
          createTaskRunner: ({ taskInstance }) => ({
            run: async () => {
              await this.performMonitoringCycle();
              return {
                state: { lastRun: new Date().toISOString() },
                schedule: { interval: options.interval },
              };
            },
          }),
        },
      });

      // Schedule the monitoring task
      await this.taskManager.ensureScheduled({
        id: MONITORING_TASK_ID,
        taskType: MONITORING_TASK_TYPE,
        schedule: { interval: options.interval },
        params: {},
        state: {},
        scope: ['endpoint-compliance'],
      });

      this.logger.info(`Agent execution monitoring started with ${options.interval} interval`);

      return { success: true };

    } catch (error) {
      this.logger.error('Failed to start agent execution monitoring:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Stops the monitoring service
   */
  async stopMonitoring(): Promise<void> {
    try {
      // Remove scheduled task
      await this.taskManager.removeIfExists(MONITORING_TASK_ID);
      this.logger.info('Agent execution monitoring stopped');
    } catch (error) {
      this.logger.error('Failed to stop monitoring:', error);
    }
  }

  /**
   * Gets comprehensive agent metrics
   */
  async getAgentMetrics(
    agentId?: string,
    timeRange: { from: string; to: string } = {
      from: 'now-1h',
      to: 'now',
    }
  ): Promise<{
    success: boolean;
    metrics?: AgentExecutionMetrics[];
    error?: string;
  }> {
    try {
      const query: any = {
        bool: {
          must: [
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
      };

      if (agentId) {
        query.bool.must.push({
          term: { 'agent.id': agentId },
        });
      }

      // Get osquery execution data
      const osqueryResponse = await this.esClient.search({
        index: 'logs-osquery.result-*',
        body: {
          query,
          aggs: {
            agents: {
              terms: {
                field: 'agent.id',
                size: 1000,
              },
              aggs: {
                hostname: {
                  terms: {
                    field: 'host.name',
                    size: 1,
                  },
                },
                query_stats: {
                  stats: {
                    field: 'osquery.elapsed_time',
                  },
                },
                success_count: {
                  filter: {
                    bool: {
                      must_not: {
                        exists: {
                          field: 'error.message',
                        },
                      },
                    },
                  },
                },
                error_count: {
                  filter: {
                    exists: {
                      field: 'error.message',
                    },
                  },
                },
                last_seen: {
                  max: {
                    field: '@timestamp',
                  },
                },
              },
            },
          },
          size: 0,
        },
      });

      // Get compliance findings data
      const complianceResponse = await this.esClient.search({
        index: 'logs-endpoint_compliance.findings-*',
        body: {
          query,
          aggs: {
            agents: {
              terms: {
                field: 'agent.id',
                size: 1000,
              },
              aggs: {
                findings_count: {
                  value_count: {
                    field: 'rule.id',
                  },
                },
                passed_findings: {
                  filter: {
                    term: { 'result.evaluation': 'passed' },
                  },
                },
                last_finding: {
                  max: {
                    field: '@timestamp',
                  },
                },
              },
            },
          },
          size: 0,
        },
      });

      // Combine metrics from both sources
      const metrics = this.combineAgentMetrics(
        osqueryResponse.body,
        complianceResponse.body,
        timeRange
      );

      return {
        success: true,
        metrics,
      };

    } catch (error) {
      this.logger.error('Failed to get agent metrics:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Gets query execution results with filtering
   */
  async getQueryExecutionResults(options: {
    agentId?: string;
    queryName?: string;
    status?: 'success' | 'error' | 'timeout';
    timeRange: { from: string; to: string };
    size?: number;
  }): Promise<{
    success: boolean;
    results?: QueryExecutionResult[];
    total?: number;
    error?: string;
  }> {
    try {
      const { agentId, queryName, status, timeRange, size = 100 } = options;

      const query: any = {
        bool: {
          must: [
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
      };

      if (agentId) {
        query.bool.must.push({ term: { 'agent.id': agentId } });
      }

      if (queryName) {
        query.bool.must.push({ term: { 'osquery.name': queryName } });
      }

      if (status) {
        if (status === 'error') {
          query.bool.must.push({ exists: { field: 'error.message' } });
        } else if (status === 'success') {
          query.bool.must_not = [{ exists: { field: 'error.message' } }];
        }
      }

      const response = await this.esClient.search({
        index: 'logs-osquery.result-*',
        body: {
          query,
          sort: [{ '@timestamp': { order: 'desc' } }],
          size,
        },
      });

      const results: QueryExecutionResult[] = response.body.hits.hits.map((hit: any) => {
        const source = hit._source;
        return {
          queryName: source.osquery?.name || 'unknown',
          agentId: source.agent?.id || 'unknown',
          hostname: source.host?.name || source.host?.hostname || 'unknown',
          executionTime: source.osquery?.elapsed_time || 0,
          resultCount: source.osquery?.counter || 0,
          status: source.error?.message ? 'error' : 'success',
          errorMessage: source.error?.message,
          timestamp: source['@timestamp'],
          packName: source.osquery?.pack,
          benchmarkId: this.extractBenchmarkFromQuery(source.osquery?.name),
        };
      });

      return {
        success: true,
        results,
        total: response.body.hits.total.value,
      };

    } catch (error) {
      this.logger.error('Failed to get query execution results:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Gets current monitoring alerts
   */
  getMonitoringAlerts(options: {
    severity?: 'info' | 'warning' | 'critical';
    acknowledged?: boolean;
    agentId?: string;
  } = {}): MonitoringAlert[] {
    let alerts = Array.from(this.alerts.values());

    if (options.severity) {
      alerts = alerts.filter(alert => alert.severity === options.severity);
    }

    if (options.acknowledged !== undefined) {
      alerts = alerts.filter(alert => alert.acknowledged === options.acknowledged);
    }

    if (options.agentId) {
      alerts = alerts.filter(alert => alert.agentId === options.agentId);
    }

    return alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Acknowledges monitoring alerts
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const alert = this.alerts.get(alertId);
      if (!alert) {
        return { success: false, error: 'Alert not found' };
      }

      alert.acknowledged = true;
      this.alerts.set(alertId, alert);

      this.logger.info(`Alert ${alertId} acknowledged by ${acknowledgedBy}`);
      
      return { success: true };

    } catch (error) {
      this.logger.error(`Failed to acknowledge alert ${alertId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Updates monitoring thresholds
   */
  updateThresholds(newThresholds: Partial<MonitoringThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    this.logger.info('Updated monitoring thresholds', this.thresholds);
  }

  /**
   * Performs a complete monitoring cycle
   */
  private async performMonitoringCycle(): Promise<void> {
    try {
      this.logger.debug('Starting agent execution monitoring cycle');

      // Get current agent metrics
      const metricsResult = await this.getAgentMetrics();
      if (!metricsResult.success || !metricsResult.metrics) {
        this.logger.warn('Failed to get agent metrics for monitoring');
        return;
      }

      const metrics = metricsResult.metrics;

      // Check each agent for issues
      for (const agentMetric of metrics) {
        await this.checkAgentHealth(agentMetric);
      }

      // Clean up old resolved alerts
      this.cleanupOldAlerts();

      this.logger.debug(`Monitoring cycle completed. Active alerts: ${this.alerts.size}`);

    } catch (error) {
      this.logger.error('Monitoring cycle failed:', error);
    }
  }

  /**
   * Checks individual agent health and generates alerts
   */
  private async checkAgentHealth(metrics: AgentExecutionMetrics): Promise<void> {
    const { agentId, hostname } = metrics;

    // Check agent availability
    const lastSeenTime = new Date(metrics.lastSeen).getTime();
    const offlineThresholdTime = Date.now() - (this.thresholds.agentOfflineThreshold * 60 * 1000);
    
    if (lastSeenTime < offlineThresholdTime) {
      this.createAlert({
        type: 'agent_offline',
        severity: 'critical',
        agentId,
        hostname,
        message: `Agent ${hostname} has been offline for more than ${this.thresholds.agentOfflineThreshold} minutes`,
        details: {
          lastSeen: metrics.lastSeen,
          thresholdMinutes: this.thresholds.agentOfflineThreshold,
        },
      });
    }

    // Check error rate
    const { totalQueries, failedQueries } = metrics.osqueryExecution;
    if (totalQueries > 0) {
      const errorRate = (failedQueries / totalQueries) * 100;
      
      if (errorRate > this.thresholds.errorRateThreshold) {
        this.createAlert({
          type: 'high_error_rate',
          severity: errorRate > 25 ? 'critical' : 'warning',
          agentId,
          hostname,
          message: `Agent ${hostname} has high query error rate: ${errorRate.toFixed(1)}%`,
          details: {
            errorRate,
            threshold: this.thresholds.errorRateThreshold,
            totalQueries,
            failedQueries,
          },
        });
      }
    }

    // Check performance
    const { avgExecutionTime, cpuUsage, memoryUsage } = metrics.osqueryExecution.avgExecutionTime 
      ? metrics.osqueryExecution 
      : { avgExecutionTime: 0, ...metrics.performance };

    if (avgExecutionTime > this.thresholds.executionTimeThreshold) {
      this.createAlert({
        type: 'performance_degradation',
        severity: 'warning',
        agentId,
        hostname,
        message: `Agent ${hostname} has slow query execution time: ${avgExecutionTime}ms`,
        details: {
          avgExecutionTime,
          threshold: this.thresholds.executionTimeThreshold,
        },
      });
    }

    if (cpuUsage > this.thresholds.cpuUsageThreshold) {
      this.createAlert({
        type: 'performance_degradation',
        severity: cpuUsage > 90 ? 'critical' : 'warning',
        agentId,
        hostname,
        message: `Agent ${hostname} has high CPU usage: ${cpuUsage}%`,
        details: {
          cpuUsage,
          threshold: this.thresholds.cpuUsageThreshold,
        },
      });
    }

    // Check compliance score
    const { complianceScore } = metrics.compliance;
    if (complianceScore < this.thresholds.complianceScoreThreshold) {
      this.createAlert({
        type: 'compliance_failure',
        severity: complianceScore < 50 ? 'critical' : 'warning',
        agentId,
        hostname,
        message: `Agent ${hostname} has low compliance score: ${complianceScore}%`,
        details: {
          complianceScore,
          threshold: this.thresholds.complianceScoreThreshold,
        },
      });
    }
  }

  /**
   * Creates or updates monitoring alerts
   */
  private createAlert(alertData: Omit<MonitoringAlert, 'id' | 'timestamp' | 'acknowledged'>): void {
    const alertId = `${alertData.type}-${alertData.agentId || 'global'}-${Date.now()}`;
    
    // Check if similar alert already exists
    const existingAlert = Array.from(this.alerts.values()).find(alert =>
      alert.type === alertData.type &&
      alert.agentId === alertData.agentId &&
      !alert.acknowledged &&
      !alert.resolvedAt
    );

    if (existingAlert) {
      // Update existing alert
      existingAlert.message = alertData.message;
      existingAlert.details = alertData.details;
      existingAlert.timestamp = new Date().toISOString();
      this.alerts.set(existingAlert.id, existingAlert);
    } else {
      // Create new alert
      const alert: MonitoringAlert = {
        ...alertData,
        id: alertId,
        timestamp: new Date().toISOString(),
        acknowledged: false,
      };
      
      this.alerts.set(alertId, alert);
      this.logger.warn(`Created monitoring alert: ${alert.message}`);
    }
  }

  /**
   * Combines metrics from osquery and compliance data
   */
  private combineAgentMetrics(
    osqueryData: any,
    complianceData: any,
    timeRange: any
  ): AgentExecutionMetrics[] {
    const metrics: AgentExecutionMetrics[] = [];
    const osqueryAgents = osqueryData.aggregations?.agents?.buckets || [];
    const complianceAgents = complianceData.aggregations?.agents?.buckets || [];

    // Create a map for compliance data
    const complianceMap = new Map();
    complianceAgents.forEach((bucket: any) => {
      complianceMap.set(bucket.key, bucket);
    });

    osqueryAgents.forEach((bucket: any) => {
      const agentId = bucket.key;
      const complianceBucket = complianceMap.get(agentId);
      
      const hostname = bucket.hostname?.buckets?.[0]?.key || 'unknown';
      const lastSeen = new Date(bucket.last_seen.value).toISOString();
      const totalQueries = bucket.doc_count;
      const successfulQueries = bucket.success_count.doc_count;
      const failedQueries = bucket.error_count.doc_count;

      const osqueryStats = bucket.query_stats;
      const avgExecutionTime = osqueryStats.avg || 0;
      const maxExecutionTime = osqueryStats.max || 0;

      const complianceFindings = complianceBucket?.findings_count?.value || 0;
      const passedFindings = complianceBucket?.passed_findings?.doc_count || 0;
      const complianceScore = complianceFindings > 0 
        ? Math.round((passedFindings / complianceFindings) * 100) 
        : 100;

      // Determine agent status
      const lastSeenTime = new Date(lastSeen).getTime();
      const isRecent = Date.now() - lastSeenTime < (5 * 60 * 1000); // 5 minutes
      const errorRate = totalQueries > 0 ? (failedQueries / totalQueries) * 100 : 0;
      
      let status: 'online' | 'offline' | 'degraded' | 'error';
      if (!isRecent) {
        status = 'offline';
      } else if (errorRate > 50 || avgExecutionTime > 30000) {
        status = 'error';
      } else if (errorRate > 10 || avgExecutionTime > 10000) {
        status = 'degraded';
      } else {
        status = 'online';
      }

      metrics.push({
        agentId,
        hostname,
        status,
        lastSeen,
        osqueryExecution: {
          totalQueries,
          successfulQueries,
          failedQueries,
          avgExecutionTime,
          maxExecutionTime,
          lastQueryTime: lastSeen,
        },
        compliance: {
          packagesDeployed: 1, // Simplified
          findingsGenerated: complianceFindings,
          lastFindingTime: complianceBucket?.last_finding?.value_as_string || '',
          complianceScore,
        },
        performance: {
          cpuUsage: Math.random() * 100, // Would come from actual metrics
          memoryUsage: Math.random() * 100,
          diskUsage: Math.random() * 100,
          networkLatency: Math.random() * 100,
        },
        errors: [], // Would be populated from actual error data
        alerts: [], // Current alerts for this agent
      });
    });

    return metrics;
  }

  /**
   * Extracts benchmark ID from query name
   */
  private extractBenchmarkFromQuery(queryName?: string): string | undefined {
    if (!queryName) return undefined;
    
    // Extract benchmark ID from compliance query names
    const match = queryName.match(/compliance[-_]([^-_]+)/);
    return match ? match[1] : undefined;
  }

  /**
   * Cleans up old resolved alerts
   */
  private cleanupOldAlerts(): void {
    const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    
    for (const [alertId, alert] of this.alerts.entries()) {
      if (alert.resolvedAt && new Date(alert.resolvedAt).getTime() < cutoffTime) {
        this.alerts.delete(alertId);
      }
    }
  }
}