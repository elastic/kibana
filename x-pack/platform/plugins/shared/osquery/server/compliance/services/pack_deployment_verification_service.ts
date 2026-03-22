/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { FleetStartContract } from '@kbn/fleet-plugin/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import { FleetApiErrorHandler } from './fleet_error_handler';

interface PackDeploymentStatus {
  packagePolicyId: string;
  benchmarkId: string;
  status: 'deployed' | 'deploying' | 'failed' | 'partially_deployed' | 'not_deployed';
  agentPolicyIds: string[];
  totalAgents: number;
  healthyAgents: number;
  deployment: {
    deployedAt: string;
    deployedBy?: string;
    version: string;
    queriesDeployed: number;
  };
  verification: {
    lastVerified: string;
    verificationStatus: 'success' | 'failed' | 'pending';
    verificationDetails: {
      agentsResponding: number;
      queriesExecuting: number;
      avgResponseTime: number;
      errorRate: number;
    };
  };
  health: {
    overallHealth: 'healthy' | 'degraded' | 'unhealthy';
    issues: Array<{
      type: 'agent_offline' | 'query_error' | 'timeout' | 'permission_denied';
      severity: 'low' | 'medium' | 'high';
      affectedAgents: number;
      description: string;
      suggestedAction: string;
    }>;
  };
  performance: {
    avgExecutionTime: number;
    maxExecutionTime: number;
    resourceUsage: {
      cpu: 'low' | 'medium' | 'high';
      memory: 'low' | 'medium' | 'high';
    };
    throughput: {
      queriesPerMinute: number;
      findingsPerMinute: number;
    };
  };
}

interface AgentExecutionStatus {
  agentId: string;
  hostname: string;
  status: 'online' | 'offline' | 'error';
  lastSeen: string;
  packExecution: {
    queriesExecuted: number;
    queriesFailed: number;
    avgResponseTime: number;
    lastExecutionTime: string;
  };
  errors: Array<{
    queryId: string;
    error: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

interface DeploymentVerificationResult {
  isSuccessful: boolean;
  verificationTimestamp: string;
  summary: {
    totalAgentPolicies: number;
    totalAgents: number;
    healthyAgents: number;
    respondingAgents: number;
    queriesVerified: number;
    queriesFailed: number;
  };
  agentDetails: AgentExecutionStatus[];
  issues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    affectedAgents: string[];
    recommendedAction: string;
  }>;
  recommendations: string[];
}

/**
 * Service for verifying and tracking compliance pack deployments.
 * Monitors agent health, query execution, and overall deployment status
 * with automated issue detection and performance monitoring.
 */
export class PackDeploymentVerificationService {
  private readonly verificationCache = new Map<string, PackDeploymentStatus>();
  private readonly monitoringIntervals = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly fleet: FleetStartContract,
    private readonly soClient: SavedObjectsClientContract,
    private readonly logger: Logger,
    private readonly errorHandler: FleetApiErrorHandler
  ) {}

  /**
   * Starts continuous monitoring for a deployed pack
   */
  async startDeploymentMonitoring(
    packagePolicyId: string,
    benchmarkId: string,
    options: {
      verificationInterval: number; // minutes
      enableContinuousMonitoring: boolean;
    } = { verificationInterval: 5, enableContinuousMonitoring: true }
  ): Promise<{
    success: boolean;
    initialStatus?: PackDeploymentStatus;
    error?: string;
  }> {
    try {
      this.logger.info(`Starting deployment monitoring for package policy: ${packagePolicyId}`);

      // Perform initial verification
      const initialVerification = await this.verifyDeployment(packagePolicyId, benchmarkId);
      
      if (!initialVerification.success) {
        return {
          success: false,
          error: initialVerification.error,
        };
      }

      const deploymentStatus = initialVerification.status!;
      this.verificationCache.set(packagePolicyId, deploymentStatus);

      // Start continuous monitoring if enabled
      if (options.enableContinuousMonitoring) {
        const intervalMs = options.verificationInterval * 60 * 1000;
        const interval = setInterval(async () => {
          try {
            await this.performScheduledVerification(packagePolicyId, benchmarkId);
          } catch (error) {
            this.logger.error(`Scheduled verification failed for ${packagePolicyId}:`, error);
          }
        }, intervalMs);

        this.monitoringIntervals.set(packagePolicyId, interval);
        this.logger.info(`Continuous monitoring started for ${packagePolicyId} (interval: ${options.verificationInterval}m)`);
      }

      return {
        success: true,
        initialStatus: deploymentStatus,
      };

    } catch (error) {
      this.logger.error(`Failed to start deployment monitoring for ${packagePolicyId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Stops monitoring for a pack deployment
   */
  stopDeploymentMonitoring(packagePolicyId: string): void {
    const interval = this.monitoringIntervals.get(packagePolicyId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(packagePolicyId);
      this.logger.info(`Stopped monitoring for package policy: ${packagePolicyId}`);
    }

    this.verificationCache.delete(packagePolicyId);
  }

  /**
   * Verifies a pack deployment and returns detailed status
   */
  async verifyDeployment(
    packagePolicyId: string,
    benchmarkId: string
  ): Promise<{
    success: boolean;
    status?: PackDeploymentStatus;
    verification?: DeploymentVerificationResult;
    error?: string;
  }> {
    try {
      this.logger.debug(`Verifying deployment for package policy: ${packagePolicyId}`);

      // Get package policy details from Fleet
      const packagePolicy = await this.errorHandler.executeWithRetry(
        () => this.fleet.packagePolicyService.asCurrentUser.get(this.soClient, packagePolicyId),
        'get-package-policy'
      );

      if (!packagePolicy.success || !packagePolicy.result) {
        return {
          success: false,
          error: `Package policy ${packagePolicyId} not found`,
        };
      }

      const policy = packagePolicy.result;
      const agentPolicyIds = policy.policy_ids || [];

      // Get agent statuses for all policies
      const agentStatuses = await this.getAgentStatuses(agentPolicyIds);
      const totalAgents = agentStatuses.length;
      const healthyAgents = agentStatuses.filter(a => a.status === 'online').length;

      // Verify query execution by checking recent osquery results
      const executionVerification = await this.verifyQueryExecution(benchmarkId, agentStatuses);

      // Analyze performance metrics
      const performanceMetrics = await this.analyzePerformanceMetrics(benchmarkId, agentStatuses);

      // Determine overall deployment status
      const deploymentStatus = this.determineDeploymentStatus(
        policy,
        agentStatuses,
        executionVerification,
        performanceMetrics
      );

      // Create detailed verification result
      const verificationResult: DeploymentVerificationResult = {
        isSuccessful: deploymentStatus.verification.verificationStatus === 'success',
        verificationTimestamp: new Date().toISOString(),
        summary: {
          totalAgentPolicies: agentPolicyIds.length,
          totalAgents,
          healthyAgents,
          respondingAgents: executionVerification.respondingAgents,
          queriesVerified: executionVerification.successfulQueries,
          queriesFailed: executionVerification.failedQueries,
        },
        agentDetails: agentStatuses,
        issues: deploymentStatus.health.issues.map(issue => ({
          type: issue.type,
          severity: issue.severity,
          description: issue.description,
          affectedAgents: [], // Would be populated with specific agent IDs
          recommendedAction: issue.suggestedAction,
        })),
        recommendations: this.generateRecommendations(deploymentStatus),
      };

      // Cache the status
      this.verificationCache.set(packagePolicyId, deploymentStatus);

      return {
        success: true,
        status: deploymentStatus,
        verification: verificationResult,
      };

    } catch (error) {
      this.logger.error(`Failed to verify deployment ${packagePolicyId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Gets the current status of a pack deployment
   */
  getDeploymentStatus(packagePolicyId: string): PackDeploymentStatus | null {
    return this.verificationCache.get(packagePolicyId) || null;
  }

  /**
   * Lists all monitored deployments
   */
  listMonitoredDeployments(): Array<{
    packagePolicyId: string;
    benchmarkId: string;
    status: PackDeploymentStatus;
    isMonitoring: boolean;
  }> {
    return Array.from(this.verificationCache.entries()).map(([packagePolicyId, status]) => ({
      packagePolicyId,
      benchmarkId: status.benchmarkId,
      status,
      isMonitoring: this.monitoringIntervals.has(packagePolicyId),
    }));
  }

  /**
   * Performs emergency health check for critical issues
   */
  async performEmergencyHealthCheck(packagePolicyId: string): Promise<{
    criticalIssues: Array<{
      type: string;
      description: string;
      immediateAction: string;
    }>;
    recommendedActions: string[];
  }> {
    try {
      const status = await this.verifyDeployment(packagePolicyId, '');
      
      if (!status.success || !status.status) {
        return {
          criticalIssues: [
            {
              type: 'deployment_failure',
              description: 'Unable to verify deployment status',
              immediateAction: 'Check Fleet and Elasticsearch connectivity',
            },
          ],
          recommendedActions: ['Restart Fleet services', 'Check system logs'],
        };
      }

      const criticalIssues = status.status.health.issues
        .filter(issue => issue.severity === 'high')
        .map(issue => ({
          type: issue.type,
          description: issue.description,
          immediateAction: issue.suggestedAction,
        }));

      const recommendedActions = [];
      
      if (status.status.health.overallHealth === 'unhealthy') {
        recommendedActions.push('Consider rolling back the deployment');
        recommendedActions.push('Investigate agent connectivity issues');
      }

      if (status.status.performance.resourceUsage.cpu === 'high') {
        recommendedActions.push('Reduce query frequency or complexity');
        recommendedActions.push('Scale agent resources');
      }

      return { criticalIssues, recommendedActions };

    } catch (error) {
      this.logger.error(`Emergency health check failed for ${packagePolicyId}:`, error);
      return {
        criticalIssues: [
          {
            type: 'health_check_failure',
            description: `Health check failed: ${error.message}`,
            immediateAction: 'Check service availability and permissions',
          },
        ],
        recommendedActions: ['Review system logs', 'Verify service configuration'],
      };
    }
  }

  /**
   * Gets agent statuses for given agent policy IDs
   */
  private async getAgentStatuses(agentPolicyIds: string[]): Promise<AgentExecutionStatus[]> {
    const agentStatuses: AgentExecutionStatus[] = [];

    try {
      for (const policyId of agentPolicyIds) {
        const agentsResult = await this.errorHandler.executeWithRetry(
          () => this.fleet.agentService.asCurrentUser.listAgents({
            esClient: this.esClient,
            soClient: this.soClient,
            kuery: `policy_id: ${policyId}`,
            perPage: 100,
          }),
          'list-agents'
        );

        if (agentsResult.success && agentsResult.result) {
          for (const agent of agentsResult.result.agents) {
            agentStatuses.push({
              agentId: agent.id,
              hostname: agent.local_metadata?.host?.hostname || agent.id,
              status: agent.status as 'online' | 'offline' | 'error',
              lastSeen: agent.last_checkin || '',
              packExecution: {
                queriesExecuted: 0, // Would be populated from actual metrics
                queriesFailed: 0,
                avgResponseTime: 0,
                lastExecutionTime: '',
              },
              errors: [], // Would be populated from error logs
            });
          }
        }
      }

      return agentStatuses;

    } catch (error) {
      this.logger.error('Failed to get agent statuses:', error);
      return agentStatuses;
    }
  }

  /**
   * Verifies query execution by checking osquery results
   */
  private async verifyQueryExecution(
    benchmarkId: string,
    agentStatuses: AgentExecutionStatus[]
  ): Promise<{
    respondingAgents: number;
    successfulQueries: number;
    failedQueries: number;
    avgResponseTime: number;
  }> {
    try {
      // Query recent osquery results to verify execution
      const response = await this.esClient.search({
        index: 'logs-osquery.result-*',
        body: {
          query: {
            bool: {
              must: [
                {
                  range: {
                    '@timestamp': {
                      gte: 'now-10m', // Look at last 10 minutes
                    },
                  },
                },
                {
                  wildcard: {
                    'osquery.name': `*${benchmarkId}*`,
                  },
                },
              ],
            },
          },
          aggs: {
            agents: {
              cardinality: {
                field: 'agent.id',
              },
            },
            queries: {
              cardinality: {
                field: 'osquery.name',
              },
            },
            avg_response_time: {
              avg: {
                field: 'osquery.elapsed_time',
              },
            },
          },
          size: 0,
        },
      });

      const aggs = response.body.aggregations;
      
      return {
        respondingAgents: aggs.agents.value || 0,
        successfulQueries: aggs.queries.value || 0,
        failedQueries: 0, // Would calculate from error conditions
        avgResponseTime: aggs.avg_response_time.value || 0,
      };

    } catch (error) {
      this.logger.error('Failed to verify query execution:', error);
      return {
        respondingAgents: 0,
        successfulQueries: 0,
        failedQueries: 0,
        avgResponseTime: 0,
      };
    }
  }

  /**
   * Analyzes performance metrics for the deployment
   */
  private async analyzePerformanceMetrics(
    benchmarkId: string,
    agentStatuses: AgentExecutionStatus[]
  ): Promise<{
    avgExecutionTime: number;
    maxExecutionTime: number;
    resourceUsage: { cpu: 'low' | 'medium' | 'high'; memory: 'low' | 'medium' | 'high' };
    throughput: { queriesPerMinute: number; findingsPerMinute: number };
  }> {
    try {
      // Analyze execution times and resource usage
      const response = await this.esClient.search({
        index: 'logs-osquery.result-*',
        body: {
          query: {
            bool: {
              must: [
                {
                  range: {
                    '@timestamp': {
                      gte: 'now-1h',
                    },
                  },
                },
                {
                  wildcard: {
                    'osquery.name': `*${benchmarkId}*`,
                  },
                },
              ],
            },
          },
          aggs: {
            execution_stats: {
              stats: {
                field: 'osquery.elapsed_time',
              },
            },
            query_rate: {
              date_histogram: {
                field: '@timestamp',
                fixed_interval: '1m',
              },
            },
          },
          size: 0,
        },
      });

      const executionStats = response.body.aggregations.execution_stats;
      const queryRate = response.body.aggregations.query_rate;

      const avgQueriesPerMinute = queryRate.buckets.length > 0 
        ? queryRate.buckets.reduce((sum: number, bucket: any) => sum + bucket.doc_count, 0) / queryRate.buckets.length
        : 0;

      // Simplified resource usage estimation
      const avgTime = executionStats.avg || 0;
      let cpuUsage: 'low' | 'medium' | 'high' = 'low';
      let memoryUsage: 'low' | 'medium' | 'high' = 'low';

      if (avgTime > 5000) { // 5 seconds
        cpuUsage = 'high';
        memoryUsage = 'high';
      } else if (avgTime > 1000) { // 1 second
        cpuUsage = 'medium';
        memoryUsage = 'medium';
      }

      return {
        avgExecutionTime: avgTime,
        maxExecutionTime: executionStats.max || 0,
        resourceUsage: { cpu: cpuUsage, memory: memoryUsage },
        throughput: {
          queriesPerMinute: avgQueriesPerMinute,
          findingsPerMinute: avgQueriesPerMinute * 0.8, // Estimate
        },
      };

    } catch (error) {
      this.logger.error('Failed to analyze performance metrics:', error);
      return {
        avgExecutionTime: 0,
        maxExecutionTime: 0,
        resourceUsage: { cpu: 'low', memory: 'low' },
        throughput: { queriesPerMinute: 0, findingsPerMinute: 0 },
      };
    }
  }

  /**
   * Determines overall deployment status based on collected data
   */
  private determineDeploymentStatus(
    packagePolicy: any,
    agentStatuses: AgentExecutionStatus[],
    executionVerification: any,
    performanceMetrics: any
  ): PackDeploymentStatus {
    const totalAgents = agentStatuses.length;
    const healthyAgents = agentStatuses.filter(a => a.status === 'online').length;
    const healthPercentage = totalAgents > 0 ? (healthyAgents / totalAgents) * 100 : 100;

    let overallStatus: PackDeploymentStatus['status'] = 'deployed';
    let verificationStatus: 'success' | 'failed' | 'pending' = 'success';
    let overallHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Determine status based on health percentage
    if (healthPercentage < 50) {
      overallStatus = 'failed';
      verificationStatus = 'failed';
      overallHealth = 'unhealthy';
    } else if (healthPercentage < 80) {
      overallStatus = 'partially_deployed';
      overallHealth = 'degraded';
    }

    const issues = this.identifyIssues(agentStatuses, executionVerification, performanceMetrics);

    return {
      packagePolicyId: packagePolicy.id,
      benchmarkId: packagePolicy.name.includes('compliance-pack-') 
        ? packagePolicy.name.replace('compliance-pack-', '') 
        : 'unknown',
      status: overallStatus,
      agentPolicyIds: packagePolicy.policy_ids || [],
      totalAgents,
      healthyAgents,
      deployment: {
        deployedAt: packagePolicy.created_at,
        version: packagePolicy.package?.version || '1.0.0',
        queriesDeployed: packagePolicy.inputs?.[0]?.config?.pack?.value?.queries 
          ? Object.keys(packagePolicy.inputs[0].config.pack.value.queries).length 
          : 0,
      },
      verification: {
        lastVerified: new Date().toISOString(),
        verificationStatus,
        verificationDetails: {
          agentsResponding: executionVerification.respondingAgents,
          queriesExecuting: executionVerification.successfulQueries,
          avgResponseTime: executionVerification.avgResponseTime,
          errorRate: executionVerification.failedQueries > 0 
            ? (executionVerification.failedQueries / (executionVerification.successfulQueries + executionVerification.failedQueries)) * 100
            : 0,
        },
      },
      health: {
        overallHealth,
        issues,
      },
      performance: {
        avgExecutionTime: performanceMetrics.avgExecutionTime,
        maxExecutionTime: performanceMetrics.maxExecutionTime,
        resourceUsage: performanceMetrics.resourceUsage,
        throughput: performanceMetrics.throughput,
      },
    };
  }

  /**
   * Identifies issues based on monitoring data
   */
  private identifyIssues(
    agentStatuses: AgentExecutionStatus[],
    executionVerification: any,
    performanceMetrics: any
  ): PackDeploymentStatus['health']['issues'] {
    const issues: PackDeploymentStatus['health']['issues'] = [];

    // Check for offline agents
    const offlineAgents = agentStatuses.filter(a => a.status === 'offline').length;
    if (offlineAgents > 0) {
      issues.push({
        type: 'agent_offline',
        severity: offlineAgents > agentStatuses.length * 0.3 ? 'high' : 'medium',
        affectedAgents: offlineAgents,
        description: `${offlineAgents} agents are offline and not executing queries`,
        suggestedAction: 'Check agent connectivity and restart offline agents',
      });
    }

    // Check for high response times
    if (performanceMetrics.avgExecutionTime > 5000) {
      issues.push({
        type: 'timeout',
        severity: 'high',
        affectedAgents: agentStatuses.length,
        description: `Average query execution time is ${Math.round(performanceMetrics.avgExecutionTime)}ms (above 5s threshold)`,
        suggestedAction: 'Optimize queries or reduce query frequency',
      });
    }

    // Check for high error rates
    if (executionVerification.failedQueries > 0) {
      const errorRate = (executionVerification.failedQueries / (executionVerification.successfulQueries + executionVerification.failedQueries)) * 100;
      if (errorRate > 10) {
        issues.push({
          type: 'query_error',
          severity: errorRate > 50 ? 'high' : 'medium',
          affectedAgents: Math.ceil(agentStatuses.length * (errorRate / 100)),
          description: `Query error rate is ${Math.round(errorRate)}%`,
          suggestedAction: 'Review query syntax and agent permissions',
        });
      }
    }

    return issues;
  }

  /**
   * Generates recommendations based on deployment status
   */
  private generateRecommendations(status: PackDeploymentStatus): string[] {
    const recommendations: string[] = [];

    if (status.health.overallHealth !== 'healthy') {
      recommendations.push('Monitor agent health and connectivity regularly');
    }

    if (status.performance.resourceUsage.cpu === 'high') {
      recommendations.push('Consider reducing query frequency or optimizing query complexity');
    }

    if (status.verification.verificationDetails.errorRate > 5) {
      recommendations.push('Review and update queries that are producing errors');
    }

    if (status.totalAgents === 0) {
      recommendations.push('Deploy agents to policies before expecting compliance data');
    }

    return recommendations;
  }

  /**
   * Performs scheduled verification (called by interval)
   */
  private async performScheduledVerification(packagePolicyId: string, benchmarkId: string): Promise<void> {
    try {
      const verification = await this.verifyDeployment(packagePolicyId, benchmarkId);
      
      if (verification.success && verification.status) {
        // Check for critical issues and log warnings
        const criticalIssues = verification.status.health.issues.filter(i => i.severity === 'high');
        
        if (criticalIssues.length > 0) {
          this.logger.warn(
            `Critical issues detected in deployment ${packagePolicyId}:`,
            criticalIssues.map(i => i.description)
          );
        }

        // Update cache
        this.verificationCache.set(packagePolicyId, verification.status);
      }
    } catch (error) {
      this.logger.error(`Scheduled verification failed for ${packagePolicyId}:`, error);
    }
  }

  /**
   * Cleanup method to stop all monitoring
   */
  stopAllMonitoring(): void {
    for (const [packagePolicyId, interval] of this.monitoringIntervals.entries()) {
      clearInterval(interval);
      this.logger.debug(`Stopped monitoring for ${packagePolicyId}`);
    }
    
    this.monitoringIntervals.clear();
    this.verificationCache.clear();
    this.logger.info('All pack deployment monitoring stopped');
  }
}