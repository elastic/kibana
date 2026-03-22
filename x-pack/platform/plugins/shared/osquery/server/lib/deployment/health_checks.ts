/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { FleetStartContract } from '@kbn/fleet-plugin/server';

export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  details?: Record<string, unknown>;
}

export interface DeploymentHealth {
  overall_status: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheckResult[];
  timestamp: string;
}

/**
 * Service for checking compliance deployment health
 * Used for pre-deployment validation and continuous monitoring
 */
export class ComplianceHealthChecks {
  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly fleet: FleetStartContract | undefined,
    private readonly logger: Logger
  ) {}

  /**
   * Run all health checks
   */
  async runAll(): Promise<DeploymentHealth> {
    const checks = await Promise.all([
      this.checkElasticsearchVersion(),
      this.checkTransformFeature(),
      this.checkILMEnabled(),
      this.checkFleetConfiguration(),
      this.checkTransformHealth(),
      this.checkIndicesExist(),
      this.checkClusterResources(),
    ]);

    const hasUnhealthy = checks.some((c) => c.status === 'unhealthy');
    const hasDegraded = checks.some((c) => c.status === 'degraded');

    return {
      overall_status: hasUnhealthy ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy',
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Check Elasticsearch version meets minimum requirement
   */
  private async checkElasticsearchVersion(): Promise<HealthCheckResult> {
    try {
      const info = await this.esClient.info();
      const version = info.version.number;
      const [major, minor] = version.split('.').map(Number);

      const minimumMajor = 8;
      const minimumMinor = 15;

      if (major > minimumMajor || (major === minimumMajor && minor >= minimumMinor)) {
        return {
          name: 'elasticsearch_version',
          status: 'healthy',
          message: `Elasticsearch ${version} meets minimum requirement (8.15+)`,
          details: { version, minimum: '8.15.0' },
        };
      }

      return {
        name: 'elasticsearch_version',
        status: 'unhealthy',
        message: `Elasticsearch ${version} below minimum requirement (8.15+)`,
        details: { version, minimum: '8.15.0' },
      };
    } catch (error) {
      return {
        name: 'elasticsearch_version',
        status: 'unhealthy',
        message: `Failed to check Elasticsearch version: ${error.message}`,
      };
    }
  }

  /**
   * Check transforms feature is enabled
   */
  private async checkTransformFeature(): Promise<HealthCheckResult> {
    try {
      // Try to list transforms (will fail if feature disabled)
      await this.esClient.transform.getTransform({ size: 1 });

      return {
        name: 'transform_feature',
        status: 'healthy',
        message: 'Transform feature is enabled',
      };
    } catch (error) {
      if (error.message.includes('disabled')) {
        return {
          name: 'transform_feature',
          status: 'unhealthy',
          message: 'Transform feature is disabled - required for findings deduplication',
        };
      }

      return {
        name: 'transform_feature',
        status: 'degraded',
        message: `Transform feature check inconclusive: ${error.message}`,
      };
    }
  }

  /**
   * Check ILM is enabled
   */
  private async checkILMEnabled(): Promise<HealthCheckResult> {
    try {
      await this.esClient.ilm.getStatus();

      return {
        name: 'ilm_enabled',
        status: 'healthy',
        message: 'ILM is enabled',
      };
    } catch (error) {
      return {
        name: 'ilm_enabled',
        status: 'degraded',
        message: 'ILM status check failed - indices may not rollover properly',
      };
    }
  }

  /**
   * Check Fleet is configured and accessible
   */
  private async checkFleetConfiguration(): Promise<HealthCheckResult> {
    if (!this.fleet) {
      return {
        name: 'fleet_configuration',
        status: 'unhealthy',
        message: 'Fleet plugin not available - cannot deploy packs',
      };
    }

    try {
      // Check if Fleet Server is configured
      const agentPolicies = await this.fleet.agentPolicyService.list(
        {} as any,
        { perPage: 1 }
      );

      if (!agentPolicies || agentPolicies.total === 0) {
        return {
          name: 'fleet_configuration',
          status: 'degraded',
          message: 'No agent policies found - create agent policies before deploying packs',
        };
      }

      return {
        name: 'fleet_configuration',
        status: 'healthy',
        message: `Fleet configured with ${agentPolicies.total} agent policies`,
        details: { agent_policies: agentPolicies.total },
      };
    } catch (error) {
      return {
        name: 'fleet_configuration',
        status: 'unhealthy',
        message: `Fleet API error: ${error.message}`,
      };
    }
  }

  /**
   * Check compliance transform health
   */
  private async checkTransformHealth(): Promise<HealthCheckResult> {
    try {
      const stats = await this.esClient.transform.getTransformStats({
        transform_id: 'compliance-findings-latest',
      });

      if (stats.transforms.length === 0) {
        return {
          name: 'transform_health',
          status: 'degraded',
          message: 'Transform not created yet - will be created on first compliance route access',
        };
      }

      const transform = stats.transforms[0];

      if (transform.state === 'started') {
        return {
          name: 'transform_health',
          status: 'healthy',
          message: `Transform is running (processed ${transform.stats.documents_processed} documents)`,
          details: {
            state: transform.state,
            documents_processed: transform.stats.documents_processed,
          },
        };
      }

      if (transform.state === 'stopped') {
        return {
          name: 'transform_health',
          status: 'degraded',
          message: 'Transform is stopped - restart to process findings',
        };
      }

      return {
        name: 'transform_health',
        status: 'unhealthy',
        message: `Transform in failed state: ${transform.state}`,
        details: { state: transform.state },
      };
    } catch (error) {
      if (error.meta?.statusCode === 404) {
        return {
          name: 'transform_health',
          status: 'degraded',
          message: 'Transform not found - will be created automatically',
        };
      }

      return {
        name: 'transform_health',
        status: 'unhealthy',
        message: `Failed to check transform: ${error.message}`,
      };
    }
  }

  /**
   * Check required indices exist
   */
  private async checkIndicesExist(): Promise<HealthCheckResult> {
    try {
      const requiredIndices = ['compliance-findings-default'];

      for (const index of requiredIndices) {
        const exists = await this.esClient.indices.exists({ index });

        if (!exists) {
          return {
            name: 'indices_exist',
            status: 'degraded',
            message: `Index ${index} not found - will be created automatically`,
          };
        }
      }

      return {
        name: 'indices_exist',
        status: 'healthy',
        message: 'All required indices exist',
      };
    } catch (error) {
      return {
        name: 'indices_exist',
        status: 'unhealthy',
        message: `Failed to check indices: ${error.message}`,
      };
    }
  }

  /**
   * Check cluster has sufficient resources
   */
  private async checkClusterResources(): Promise<HealthCheckResult> {
    try {
      const health = await this.esClient.cluster.health();

      if (health.status === 'red') {
        return {
          name: 'cluster_resources',
          status: 'unhealthy',
          message: 'Cluster health is RED - data loss possible',
          details: {
            status: health.status,
            active_shards: health.active_shards,
            unassigned_shards: health.unassigned_shards,
          },
        };
      }

      if (health.status === 'yellow') {
        return {
          name: 'cluster_resources',
          status: 'degraded',
          message: 'Cluster health is YELLOW - some replicas unassigned',
          details: {
            status: health.status,
            active_shards: health.active_shards,
            unassigned_shards: health.unassigned_shards,
          },
        };
      }

      return {
        name: 'cluster_resources',
        status: 'healthy',
        message: `Cluster health is GREEN (${health.number_of_nodes} nodes)`,
        details: {
          status: health.status,
          nodes: health.number_of_nodes,
          active_shards: health.active_shards,
        },
      };
    } catch (error) {
      return {
        name: 'cluster_resources',
        status: 'unhealthy',
        message: `Failed to check cluster health: ${error.message}`,
      };
    }
  }

  /**
   * Quick health check (subset for fast validation)
   */
  async runQuickCheck(): Promise<DeploymentHealth> {
    const checks = await Promise.all([
      this.checkTransformHealth(),
      this.checkFleetConfiguration(),
      this.checkClusterResources(),
    ]);

    const hasUnhealthy = checks.some((c) => c.status === 'unhealthy');
    const hasDegraded = checks.some((c) => c.status === 'degraded');

    return {
      overall_status: hasUnhealthy ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy',
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}
