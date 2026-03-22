/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { FleetStartContract } from '@kbn/fleet-plugin/server';
import type { 
  AgentPolicy,
  NewPackagePolicy,
  UpdatePackagePolicy,
  PackagePolicy 
} from '@kbn/fleet-plugin/common';
import type { ComplianceRuleMetadata } from '../../../common/compliance/types';
import { COMPLIANCE_SCHEDULE_ID_PREFIX } from '../../../common/compliance/constants';

interface FleetPackConfiguration {
  packId: string;
  name: string;
  description: string;
  platform: string;
  queries: FleetQueryConfiguration[];
  schedule: {
    interval: number; // seconds
    snapshot?: boolean;
  };
}

interface FleetQueryConfiguration {
  query_name: string;
  query: string;
  interval: number;
  platform?: string;
  description?: string;
  value?: string;
  removed?: boolean;
  snapshot?: boolean;
  ecs_mapping?: Record<string, any>;
}

interface PackDeploymentOptions {
  agentPolicyIds?: string[];
  namespace?: string;
  enabled?: boolean;
  force?: boolean;
}

interface PackDeploymentResult {
  success: boolean;
  packagePolicyId?: string;
  agentPolicies: string[];
  errors: string[];
  warnings: string[];
  deployedQueries: number;
}

/**
 * Service for deploying compliance rules as osquery packs via Fleet API.
 * Handles the conversion from compliance rules to Fleet package policies
 * and manages the full lifecycle of pack deployment to agent policies.
 */
export class FleetPackDeploymentService {
  private readonly OSQUERY_INTEGRATION_NAME = 'osquery_manager';
  private readonly COMPLIANCE_PACK_PREFIX = 'compliance-pack';

  constructor(
    private readonly fleet: FleetStartContract,
    private readonly soClient: SavedObjectsClientContract,
    private readonly logger: Logger
  ) {}

  /**
   * Deploys compliance rules as an osquery pack to specified agent policies
   */
  async deployCompliancePack(
    rules: ComplianceRuleMetadata[],
    benchmarkId: string,
    options: PackDeploymentOptions = {}
  ): Promise<PackDeploymentResult> {
    const { agentPolicyIds = [], namespace = 'default', enabled = true, force = false } = options;

    this.logger.info(`Deploying compliance pack for benchmark ${benchmarkId} to ${agentPolicyIds.length} agent policies`);

    const errors: string[] = [];
    const warnings: string[] = [];
    let deployedQueries = 0;
    let packagePolicyId: string | undefined;

    try {
      // Step 1: Build Fleet pack configuration from compliance rules
      const packConfig = await this.buildPackConfiguration(rules, benchmarkId);
      deployedQueries = packConfig.queries.length;

      if (packConfig.queries.length === 0) {
        warnings.push('No queries generated from compliance rules');
        return {
          success: false,
          agentPolicies: agentPolicyIds,
          errors: ['No valid queries to deploy'],
          warnings,
          deployedQueries: 0,
        };
      }

      // Step 2: Validate agent policies exist and are accessible
      const validAgentPolicyIds = await this.validateAgentPolicies(agentPolicyIds);
      if (validAgentPolicyIds.length === 0) {
        errors.push('No valid agent policies found');
        return {
          success: false,
          agentPolicies: agentPolicyIds,
          errors,
          warnings,
          deployedQueries,
        };
      }

      // Step 3: Check for existing compliance pack and handle conflicts
      const existingPackagePolicy = await this.findExistingCompliancePackagePolicy(benchmarkId, namespace);
      
      if (existingPackagePolicy && !force) {
        errors.push(`Compliance pack already exists for benchmark ${benchmarkId}. Use force=true to update.`);
        return {
          success: false,
          packagePolicyId: existingPackagePolicy.id,
          agentPolicies: agentPolicyIds,
          errors,
          warnings,
          deployedQueries,
        };
      }

      // Step 4: Create or update package policy
      if (existingPackagePolicy && force) {
        // Update existing package policy
        packagePolicyId = await this.updatePackagePolicy(existingPackagePolicy, packConfig, validAgentPolicyIds);
        this.logger.info(`Updated existing compliance pack ${packagePolicyId} for benchmark ${benchmarkId}`);
      } else {
        // Create new package policy
        packagePolicyId = await this.createPackagePolicy(packConfig, validAgentPolicyIds, namespace);
        this.logger.info(`Created new compliance pack ${packagePolicyId} for benchmark ${benchmarkId}`);
      }

      // Step 5: Verify deployment
      const deploymentVerification = await this.verifyPackDeployment(packagePolicyId, validAgentPolicyIds);
      if (!deploymentVerification.success) {
        warnings.push(`Pack deployed but verification failed: ${deploymentVerification.error}`);
      }

      return {
        success: true,
        packagePolicyId,
        agentPolicies: validAgentPolicyIds,
        errors,
        warnings,
        deployedQueries,
      };

    } catch (error) {
      this.logger.error(`Failed to deploy compliance pack for benchmark ${benchmarkId}:`, error);
      errors.push(`Deployment failed: ${error.message}`);

      return {
        success: false,
        packagePolicyId,
        agentPolicies: agentPolicyIds,
        errors,
        warnings,
        deployedQueries,
      };
    }
  }

  /**
   * Removes a compliance pack from agent policies
   */
  async removeCompliancePack(
    benchmarkId: string,
    namespace: string = 'default'
  ): Promise<{
    success: boolean;
    removedPackagePolicy?: string;
    errors: string[];
  }> {
    this.logger.info(`Removing compliance pack for benchmark ${benchmarkId}`);

    try {
      const existingPackagePolicy = await this.findExistingCompliancePackagePolicy(benchmarkId, namespace);
      
      if (!existingPackagePolicy) {
        return {
          success: true,
          errors: [],
        };
      }

      await this.fleet.packagePolicyService.asCurrentUser.delete(
        this.soClient,
        [existingPackagePolicy.id],
        { force: true }
      );

      this.logger.info(`Successfully removed compliance pack ${existingPackagePolicy.id} for benchmark ${benchmarkId}`);

      return {
        success: true,
        removedPackagePolicy: existingPackagePolicy.id,
        errors: [],
      };

    } catch (error) {
      this.logger.error(`Failed to remove compliance pack for benchmark ${benchmarkId}:`, error);
      return {
        success: false,
        errors: [`Removal failed: ${error.message}`],
      };
    }
  }

  /**
   * Lists all compliance packs currently deployed
   */
  async listCompliancePacks(namespace: string = 'default'): Promise<{
    packs: Array<{
      packagePolicyId: string;
      name: string;
      benchmarkId: string;
      agentPolicies: string[];
      enabled: boolean;
      queryCount: number;
      lastUpdated: string;
    }>;
    total: number;
  }> {
    try {
      const packagePolicies = await this.fleet.packagePolicyService.asCurrentUser.list(
        this.soClient,
        {
          kuery: `package_policies.package.name: ${this.OSQUERY_INTEGRATION_NAME} AND package_policies.name: ${this.COMPLIANCE_PACK_PREFIX}-*`,
          perPage: 100,
        }
      );

      const packs = packagePolicies.items
        .filter(policy => policy.name.startsWith(this.COMPLIANCE_PACK_PREFIX))
        .map(policy => {
          const benchmarkId = this.extractBenchmarkIdFromPackName(policy.name);
          const queryCount = this.extractQueryCountFromPackagePolicy(policy);
          
          return {
            packagePolicyId: policy.id,
            name: policy.name,
            benchmarkId,
            agentPolicies: policy.policy_ids || [],
            enabled: policy.enabled,
            queryCount,
            lastUpdated: policy.updated_at,
          };
        });

      return {
        packs,
        total: packs.length,
      };

    } catch (error) {
      this.logger.error('Failed to list compliance packs:', error);
      return {
        packs: [],
        total: 0,
      };
    }
  }

  /**
   * Gets deployment status for a specific benchmark
   */
  async getPackDeploymentStatus(benchmarkId: string, namespace: string = 'default'): Promise<{
    isDeployed: boolean;
    packagePolicyId?: string;
    agentPolicies: string[];
    queryCount: number;
    enabled: boolean;
    lastUpdated?: string;
    agentCount: number;
    errors: string[];
  }> {
    try {
      const packagePolicy = await this.findExistingCompliancePackagePolicy(benchmarkId, namespace);
      
      if (!packagePolicy) {
        return {
          isDeployed: false,
          agentPolicies: [],
          queryCount: 0,
          enabled: false,
          agentCount: 0,
          errors: [],
        };
      }

      // Get agent count for the policies
      let agentCount = 0;
      for (const policyId of packagePolicy.policy_ids || []) {
        try {
          const agents = await this.fleet.agentService.asCurrentUser.listAgents({
            esClient: {} as any, // This would need the actual ES client
            soClient: this.soClient,
            perPage: 0, // Just get count
            kuery: `policy_id: ${policyId}`,
          });
          agentCount += agents.total;
        } catch (error) {
          this.logger.warn(`Failed to get agent count for policy ${policyId}:`, error);
        }
      }

      return {
        isDeployed: true,
        packagePolicyId: packagePolicy.id,
        agentPolicies: packagePolicy.policy_ids || [],
        queryCount: this.extractQueryCountFromPackagePolicy(packagePolicy),
        enabled: packagePolicy.enabled,
        lastUpdated: packagePolicy.updated_at,
        agentCount,
        errors: [],
      };

    } catch (error) {
      this.logger.error(`Failed to get deployment status for benchmark ${benchmarkId}:`, error);
      return {
        isDeployed: false,
        agentPolicies: [],
        queryCount: 0,
        enabled: false,
        agentCount: 0,
        errors: [error.message],
      };
    }
  }

  /**
   * Builds Fleet pack configuration from compliance rules
   */
  private async buildPackConfiguration(
    rules: ComplianceRuleMetadata[],
    benchmarkId: string
  ): Promise<FleetPackConfiguration> {
    const queries: FleetQueryConfiguration[] = [];

    for (const rule of rules) {
      if (!rule.enabled) {
        continue;
      }

      const queryName = `${COMPLIANCE_SCHEDULE_ID_PREFIX}${rule.rule_number || rule.id}`;
      
      queries.push({
        query_name: queryName,
        query: rule.osquery_query,
        interval: rule.interval || 300, // Default 5 minutes
        platform: rule.platform,
        description: `${rule.name} (${rule.benchmark.name} ${rule.section})`,
        snapshot: false, // Compliance queries should run continuously
        ecs_mapping: {
          // Map osquery results to ECS fields for consistency
          'osquery.decorations.hostname': 'host.name',
          'osquery.decorations.uuid': 'host.id',
          'osquery.name': 'osquery.action.name',
          'osquery.hostIdentifier': 'agent.id',
        },
      });
    }

    return {
      packId: `${this.COMPLIANCE_PACK_PREFIX}-${benchmarkId}`,
      name: `${this.COMPLIANCE_PACK_PREFIX}-${benchmarkId}`,
      description: `Compliance monitoring pack for ${benchmarkId} - automatically generated`,
      platform: this.getPlatformFromRules(rules),
      queries,
      schedule: {
        interval: 300, // Default pack interval
        snapshot: false,
      },
    };
  }

  /**
   * Validates that agent policies exist and are accessible
   */
  private async validateAgentPolicies(agentPolicyIds: string[]): Promise<string[]> {
    const validPolicyIds: string[] = [];

    for (const policyId of agentPolicyIds) {
      try {
        const agentPolicy = await this.fleet.agentPolicyService.asCurrentUser.get(
          this.soClient,
          policyId
        );
        
        if (agentPolicy) {
          validPolicyIds.push(policyId);
        }
      } catch (error) {
        this.logger.warn(`Agent policy ${policyId} not found or not accessible:`, error);
      }
    }

    return validPolicyIds;
  }

  /**
   * Finds existing compliance package policy for a benchmark
   */
  private async findExistingCompliancePackagePolicy(
    benchmarkId: string, 
    namespace: string
  ): Promise<PackagePolicy | null> {
    try {
      const packName = `${this.COMPLIANCE_PACK_PREFIX}-${benchmarkId}`;
      
      const packagePolicies = await this.fleet.packagePolicyService.asCurrentUser.list(
        this.soClient,
        {
          kuery: `package_policies.name: "${packName}" AND package_policies.package.name: ${this.OSQUERY_INTEGRATION_NAME}`,
          perPage: 1,
        }
      );

      return packagePolicies.items[0] || null;
    } catch (error) {
      this.logger.error(`Failed to find existing package policy for benchmark ${benchmarkId}:`, error);
      return null;
    }
  }

  /**
   * Creates a new package policy for the compliance pack
   */
  private async createPackagePolicy(
    packConfig: FleetPackConfiguration,
    agentPolicyIds: string[],
    namespace: string
  ): Promise<string> {
    const newPackagePolicy: NewPackagePolicy = {
      name: packConfig.name,
      description: packConfig.description,
      namespace,
      enabled: true,
      policy_ids: agentPolicyIds,
      package: {
        name: this.OSQUERY_INTEGRATION_NAME,
        title: 'Osquery Manager',
        version: 'latest',
      },
      inputs: [
        {
          type: 'osquery',
          policy_template: 'osquery_manager',
          enabled: true,
          streams: [
            {
              enabled: true,
              data_stream: {
                type: 'logs',
                dataset: 'osquery_manager.result',
              },
              vars: {
                pack: {
                  value: JSON.stringify({
                    [packConfig.packId]: {
                      queries: packConfig.queries.reduce((acc, query) => {
                        acc[query.query_name] = {
                          query: query.query,
                          interval: query.interval,
                          platform: query.platform,
                          description: query.description,
                          snapshot: query.snapshot,
                        };
                        return acc;
                      }, {} as Record<string, any>),
                    },
                  }),
                  type: 'yaml',
                },
              },
            },
          ],
        },
      ],
    };

    const createdPolicy = await this.fleet.packagePolicyService.asCurrentUser.create(
      this.soClient,
      newPackagePolicy
    );

    return createdPolicy.id;
  }

  /**
   * Updates an existing package policy
   */
  private async updatePackagePolicy(
    existingPolicy: PackagePolicy,
    packConfig: FleetPackConfiguration,
    agentPolicyIds: string[]
  ): Promise<string> {
    const updatePackagePolicy: UpdatePackagePolicy = {
      ...existingPolicy,
      policy_ids: agentPolicyIds,
      inputs: [
        {
          type: 'osquery',
          policy_template: 'osquery_manager',
          enabled: true,
          streams: [
            {
              enabled: true,
              data_stream: {
                type: 'logs',
                dataset: 'osquery_manager.result',
              },
              vars: {
                pack: {
                  value: JSON.stringify({
                    [packConfig.packId]: {
                      queries: packConfig.queries.reduce((acc, query) => {
                        acc[query.query_name] = {
                          query: query.query,
                          interval: query.interval,
                          platform: query.platform,
                          description: query.description,
                          snapshot: query.snapshot,
                        };
                        return acc;
                      }, {} as Record<string, any>),
                    },
                  }),
                  type: 'yaml',
                },
              },
            },
          ],
        },
      ],
    };

    const updatedPolicy = await this.fleet.packagePolicyService.asCurrentUser.update(
      this.soClient,
      existingPolicy.id,
      updatePackagePolicy
    );

    return updatedPolicy.id;
  }

  /**
   * Verifies that pack deployment was successful
   */
  private async verifyPackDeployment(
    packagePolicyId: string, 
    agentPolicyIds: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify package policy exists
      const packagePolicy = await this.fleet.packagePolicyService.asCurrentUser.get(
        this.soClient,
        packagePolicyId
      );

      if (!packagePolicy) {
        return { success: false, error: 'Package policy not found after creation' };
      }

      if (!packagePolicy.enabled) {
        return { success: false, error: 'Package policy is disabled' };
      }

      // Verify it's assigned to expected agent policies
      const assignedPolicyIds = packagePolicy.policy_ids || [];
      const missingPolicies = agentPolicyIds.filter(id => !assignedPolicyIds.includes(id));
      
      if (missingPolicies.length > 0) {
        return { 
          success: false, 
          error: `Package policy not assigned to all expected agent policies: ${missingPolicies.join(', ')}` 
        };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Extracts benchmark ID from pack name
   */
  private extractBenchmarkIdFromPackName(packName: string): string {
    const prefix = `${this.COMPLIANCE_PACK_PREFIX}-`;
    return packName.startsWith(prefix) ? packName.substring(prefix.length) : packName;
  }

  /**
   * Extracts query count from package policy configuration
   */
  private extractQueryCountFromPackagePolicy(packagePolicy: PackagePolicy): number {
    try {
      const packVar = packagePolicy.inputs?.[0]?.streams?.[0]?.vars?.pack?.value;
      if (typeof packVar === 'string') {
        const packConfig = JSON.parse(packVar);
        const packKeys = Object.keys(packConfig);
        if (packKeys.length > 0) {
          const queries = packConfig[packKeys[0]]?.queries || {};
          return Object.keys(queries).length;
        }
      }
      return 0;
    } catch (error) {
      this.logger.warn('Failed to extract query count from package policy:', error);
      return 0;
    }
  }

  /**
   * Determines the platform from a set of rules
   */
  private getPlatformFromRules(rules: ComplianceRuleMetadata[]): string {
    const platforms = [...new Set(rules.map(rule => rule.platform))];
    return platforms.length === 1 ? platforms[0] : 'all';
  }
}