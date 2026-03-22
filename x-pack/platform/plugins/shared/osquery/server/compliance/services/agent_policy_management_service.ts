/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { FleetStartContract } from '@kbn/fleet-plugin/server';
import type { AgentPolicy, NewAgentPolicy, UpdateAgentPolicy } from '@kbn/fleet-plugin/common';

interface AgentPolicyInfo {
  id: string;
  name: string;
  description?: string;
  namespace: string;
  agentCount: number;
  packagePolicyCount: number;
  isManaged: boolean;
  status: 'active' | 'inactive';
  lastUpdated: string;
}

interface ComplianceAgentPolicyOptions {
  name?: string;
  description?: string;
  namespace?: string;
  monitoringEnabled?: boolean;
  dataOutputId?: string;
  monitoringOutputId?: string;
}

/**
 * Service for managing Fleet agent policies specifically for compliance pack deployment.
 * Handles creation, modification, and removal of agent policies used for compliance monitoring.
 */
export class ComplianceAgentPolicyManagementService {
  private readonly COMPLIANCE_POLICY_PREFIX = 'compliance-monitoring';

  constructor(
    private readonly fleet: FleetStartContract,
    private readonly soClient: SavedObjectsClientContract,
    private readonly logger: Logger
  ) {}

  /**
   * Creates a new agent policy optimized for compliance monitoring
   */
  async createComplianceAgentPolicy(
    options: ComplianceAgentPolicyOptions = {}
  ): Promise<{
    success: boolean;
    agentPolicy?: AgentPolicy;
    error?: string;
  }> {
    const {
      name = `${this.COMPLIANCE_POLICY_PREFIX}-${Date.now()}`,
      description = 'Agent policy for endpoint compliance monitoring via osquery',
      namespace = 'default',
      monitoringEnabled = true,
    } = options;

    this.logger.info(`Creating compliance agent policy: ${name}`);

    try {
      const newAgentPolicy: NewAgentPolicy = {
        name,
        description,
        namespace,
        monitoring_enabled: [
          ...(monitoringEnabled ? ['logs'] : []),
          'metrics'
        ],
        unenroll_timeout: 900, // 15 minutes
        inactivity_timeout: 1209600, // 2 weeks
        agent_features: [
          {
            name: 'osquery',
            enabled: true,
          }
        ],
        package_policies: [], // Will be populated when compliance packs are added
        is_managed: false,
        is_default: false,
        is_default_fleet_server: false,
        data_output_id: options.dataOutputId,
        monitoring_output_id: options.monitoringOutputId,
      };

      const createdPolicy = await this.fleet.agentPolicyService.asCurrentUser.create(
        this.soClient,
        newAgentPolicy,
        {
          id: undefined,
          bumpRevision: true,
        }
      );

      this.logger.info(`Successfully created agent policy: ${createdPolicy.id}`);

      return {
        success: true,
        agentPolicy: createdPolicy,
      };

    } catch (error) {
      this.logger.error(`Failed to create compliance agent policy:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Updates an existing agent policy with compliance-specific settings
   */
  async updateAgentPolicyForCompliance(
    policyId: string,
    updates: Partial<ComplianceAgentPolicyOptions>
  ): Promise<{
    success: boolean;
    agentPolicy?: AgentPolicy;
    error?: string;
  }> {
    this.logger.info(`Updating agent policy ${policyId} for compliance`);

    try {
      const existingPolicy = await this.fleet.agentPolicyService.asCurrentUser.get(
        this.soClient,
        policyId
      );

      if (!existingPolicy) {
        return {
          success: false,
          error: `Agent policy ${policyId} not found`,
        };
      }

      const updateData: UpdateAgentPolicy = {
        ...existingPolicy,
        ...(updates.name && { name: updates.name }),
        ...(updates.description && { description: updates.description }),
        ...(updates.namespace && { namespace: updates.namespace }),
        ...(updates.monitoringEnabled !== undefined && {
          monitoring_enabled: [
            ...(updates.monitoringEnabled ? ['logs'] : []),
            'metrics'
          ]
        }),
        // Ensure osquery agent feature is enabled
        agent_features: [
          ...(existingPolicy.agent_features || []).filter(f => f.name !== 'osquery'),
          {
            name: 'osquery',
            enabled: true,
          }
        ],
      };

      const updatedPolicy = await this.fleet.agentPolicyService.asCurrentUser.update(
        this.soClient,
        policyId,
        updateData,
        {
          bumpRevision: true,
        }
      );

      this.logger.info(`Successfully updated agent policy: ${policyId}`);

      return {
        success: true,
        agentPolicy: updatedPolicy,
      };

    } catch (error) {
      this.logger.error(`Failed to update agent policy ${policyId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Assigns a compliance pack to multiple agent policies
   */
  async assignPackToAgentPolicies(
    packagePolicyId: string,
    agentPolicyIds: string[]
  ): Promise<{
    success: boolean;
    assigned: string[];
    failed: Array<{ policyId: string; error: string }>;
  }> {
    this.logger.info(`Assigning package policy ${packagePolicyId} to ${agentPolicyIds.length} agent policies`);

    const assigned: string[] = [];
    const failed: Array<{ policyId: string; error: string }> = [];

    for (const policyId of agentPolicyIds) {
      try {
        // Get the package policy
        const packagePolicy = await this.fleet.packagePolicyService.asCurrentUser.get(
          this.soClient,
          packagePolicyId
        );

        if (!packagePolicy) {
          failed.push({ policyId, error: 'Package policy not found' });
          continue;
        }

        // Check if already assigned
        if (packagePolicy.policy_ids?.includes(policyId)) {
          this.logger.debug(`Package policy ${packagePolicyId} already assigned to ${policyId}`);
          assigned.push(policyId);
          continue;
        }

        // Update package policy to include this agent policy
        const updatedPackagePolicy = await this.fleet.packagePolicyService.asCurrentUser.update(
          this.soClient,
          packagePolicyId,
          {
            ...packagePolicy,
            policy_ids: [...(packagePolicy.policy_ids || []), policyId],
          }
        );

        assigned.push(policyId);
        this.logger.debug(`Successfully assigned package policy to agent policy: ${policyId}`);

      } catch (error) {
        this.logger.error(`Failed to assign package policy to agent policy ${policyId}:`, error);
        failed.push({ policyId, error: error.message });
      }
    }

    return {
      success: failed.length === 0,
      assigned,
      failed,
    };
  }

  /**
   * Removes a compliance pack from agent policies
   */
  async removePackFromAgentPolicies(
    packagePolicyId: string,
    agentPolicyIds: string[]
  ): Promise<{
    success: boolean;
    removed: string[];
    failed: Array<{ policyId: string; error: string }>;
  }> {
    this.logger.info(`Removing package policy ${packagePolicyId} from ${agentPolicyIds.length} agent policies`);

    const removed: string[] = [];
    const failed: Array<{ policyId: string; error: string }> = [];

    try {
      const packagePolicy = await this.fleet.packagePolicyService.asCurrentUser.get(
        this.soClient,
        packagePolicyId
      );

      if (!packagePolicy) {
        return {
          success: false,
          removed: [],
          failed: agentPolicyIds.map(id => ({ policyId: id, error: 'Package policy not found' })),
        };
      }

      // Filter out the specified agent policies
      const updatedPolicyIds = (packagePolicy.policy_ids || []).filter(
        id => !agentPolicyIds.includes(id)
      );

      await this.fleet.packagePolicyService.asCurrentUser.update(
        this.soClient,
        packagePolicyId,
        {
          ...packagePolicy,
          policy_ids: updatedPolicyIds,
        }
      );

      // All policies were successfully removed from the package policy
      removed.push(...agentPolicyIds);

    } catch (error) {
      this.logger.error(`Failed to remove package policy from agent policies:`, error);
      failed.push(...agentPolicyIds.map(id => ({ policyId: id, error: error.message })));
    }

    return {
      success: failed.length === 0,
      removed,
      failed,
    };
  }

  /**
   * Lists agent policies suitable for compliance monitoring
   */
  async listComplianceCapableAgentPolicies(
    namespace?: string
  ): Promise<{
    policies: AgentPolicyInfo[];
    total: number;
  }> {
    try {
      const listOptions: Parameters<typeof this.fleet.agentPolicyService.asCurrentUser.list>[1] = {
        perPage: 100,
        sortField: 'updated_at',
        sortOrder: 'desc',
      };

      if (namespace) {
        listOptions.kuery = `namespaces: "${namespace}"`;
      }

      const agentPoliciesResult = await this.fleet.agentPolicyService.asCurrentUser.list(
        this.soClient,
        listOptions
      );

      const policies: AgentPolicyInfo[] = [];

      for (const policy of agentPoliciesResult.items) {
        // Check if policy is suitable for compliance (has osquery capability)
        const hasOsqueryFeature = policy.agent_features?.some(f => f.name === 'osquery' && f.enabled);
        
        if (!hasOsqueryFeature && !policy.name.includes(this.COMPLIANCE_POLICY_PREFIX)) {
          continue; // Skip policies that don't support osquery
        }

        // Get agent count for this policy
        let agentCount = 0;
        try {
          const agents = await this.fleet.agentService.asCurrentUser.listAgents({
            esClient: {} as any, // Would need actual ES client
            soClient: this.soClient,
            perPage: 0, // Just get count
            kuery: `policy_id: ${policy.id}`,
          });
          agentCount = agents.total;
        } catch (error) {
          this.logger.debug(`Failed to get agent count for policy ${policy.id}:`, error);
        }

        policies.push({
          id: policy.id,
          name: policy.name,
          description: policy.description,
          namespace: policy.namespace,
          agentCount,
          packagePolicyCount: policy.package_policies?.length || 0,
          isManaged: policy.is_managed || false,
          status: policy.status || 'active',
          lastUpdated: policy.updated_at,
        });
      }

      return {
        policies,
        total: policies.length,
      };

    } catch (error) {
      this.logger.error('Failed to list compliance-capable agent policies:', error);
      return {
        policies: [],
        total: 0,
      };
    }
  }

  /**
   * Gets detailed information about an agent policy including compliance-related data
   */
  async getAgentPolicyComplianceInfo(policyId: string): Promise<{
    policy?: AgentPolicyInfo & {
      compliancePackages: Array<{
        packagePolicyId: string;
        name: string;
        benchmarkId: string;
        enabled: boolean;
      }>;
      agents: Array<{
        id: string;
        hostname: string;
        platform: string;
        status: string;
        lastCheckin: string;
      }>;
    };
    error?: string;
  }> {
    try {
      const policy = await this.fleet.agentPolicyService.asCurrentUser.get(
        this.soClient,
        policyId
      );

      if (!policy) {
        return { error: `Agent policy ${policyId} not found` };
      }

      // Get compliance-related package policies
      const compliancePackages = [];
      if (policy.package_policies) {
        for (const pkgPolicy of policy.package_policies) {
          if (typeof pkgPolicy === 'string') continue; // Skip if only ID
          
          const packagePolicyObj = typeof pkgPolicy === 'object' ? pkgPolicy : 
            await this.fleet.packagePolicyService.asCurrentUser.get(this.soClient, pkgPolicy);

          if (packagePolicyObj?.name?.includes('compliance-pack')) {
            // Extract benchmark ID from name
            const benchmarkMatch = packagePolicyObj.name.match(/compliance-pack-(.+)/);
            const benchmarkId = benchmarkMatch ? benchmarkMatch[1] : 'unknown';

            compliancePackages.push({
              packagePolicyId: packagePolicyObj.id,
              name: packagePolicyObj.name,
              benchmarkId,
              enabled: packagePolicyObj.enabled,
            });
          }
        }
      }

      // Get agents for this policy
      const agents = [];
      try {
        const agentsResult = await this.fleet.agentService.asCurrentUser.listAgents({
          esClient: {} as any, // Would need actual ES client
          soClient: this.soClient,
          kuery: `policy_id: ${policyId}`,
          perPage: 50,
        });

        for (const agent of agentsResult.agents) {
          agents.push({
            id: agent.id,
            hostname: agent.local_metadata?.host?.hostname || 'unknown',
            platform: agent.local_metadata?.os?.platform || 'unknown',
            status: agent.status,
            lastCheckin: agent.last_checkin || '',
          });
        }
      } catch (error) {
        this.logger.debug(`Failed to get agents for policy ${policyId}:`, error);
      }

      return {
        policy: {
          id: policy.id,
          name: policy.name,
          description: policy.description,
          namespace: policy.namespace,
          agentCount: agents.length,
          packagePolicyCount: policy.package_policies?.length || 0,
          isManaged: policy.is_managed || false,
          status: policy.status || 'active',
          lastUpdated: policy.updated_at,
          compliancePackages,
          agents,
        },
      };

    } catch (error) {
      this.logger.error(`Failed to get agent policy compliance info for ${policyId}:`, error);
      return { error: error.message };
    }
  }

  /**
   * Validates that agent policies are suitable for compliance monitoring
   */
  async validateAgentPoliciesForCompliance(policyIds: string[]): Promise<{
    valid: string[];
    invalid: Array<{ policyId: string; reasons: string[] }>;
  }> {
    const valid: string[] = [];
    const invalid: Array<{ policyId: string; reasons: string[] }> = [];

    for (const policyId of policyIds) {
      const reasons: string[] = [];

      try {
        const policy = await this.fleet.agentPolicyService.asCurrentUser.get(
          this.soClient,
          policyId
        );

        if (!policy) {
          reasons.push('Policy not found');
        } else {
          // Check if osquery feature is enabled
          const hasOsqueryFeature = policy.agent_features?.some(f => f.name === 'osquery' && f.enabled);
          if (!hasOsqueryFeature) {
            reasons.push('Osquery agent feature not enabled');
          }

          // Check if policy is managed (managed policies can't be modified)
          if (policy.is_managed) {
            reasons.push('Policy is managed and cannot be modified');
          }

          // Check agent count (warn if no agents)
          try {
            const agents = await this.fleet.agentService.asCurrentUser.listAgents({
              esClient: {} as any, // Would need actual ES client
              soClient: this.soClient,
              perPage: 1,
              kuery: `policy_id: ${policyId}`,
            });

            if (agents.total === 0) {
              reasons.push('No agents enrolled in this policy');
            }
          } catch (error) {
            reasons.push(`Failed to check agent count: ${error.message}`);
          }
        }

        if (reasons.length === 0) {
          valid.push(policyId);
        } else {
          invalid.push({ policyId, reasons });
        }

      } catch (error) {
        invalid.push({ policyId, reasons: [`Validation error: ${error.message}`] });
      }
    }

    return { valid, invalid };
  }

  /**
   * Clones an existing agent policy for compliance monitoring
   */
  async cloneAgentPolicyForCompliance(
    sourcePolicyId: string,
    options: { name?: string; description?: string } = {}
  ): Promise<{
    success: boolean;
    clonedPolicy?: AgentPolicy;
    error?: string;
  }> {
    try {
      const sourcePolicy = await this.fleet.agentPolicyService.asCurrentUser.get(
        this.soClient,
        sourcePolicyId
      );

      if (!sourcePolicy) {
        return {
          success: false,
          error: `Source policy ${sourcePolicyId} not found`,
        };
      }

      const clonedName = options.name || `${sourcePolicy.name} (Compliance Clone)`;
      const clonedDescription = options.description || `${sourcePolicy.description} - Cloned for compliance monitoring`;

      // Create new policy based on source
      const newAgentPolicy: NewAgentPolicy = {
        name: clonedName,
        description: clonedDescription,
        namespace: sourcePolicy.namespace,
        monitoring_enabled: sourcePolicy.monitoring_enabled,
        unenroll_timeout: sourcePolicy.unenroll_timeout,
        inactivity_timeout: sourcePolicy.inactivity_timeout,
        agent_features: [
          ...(sourcePolicy.agent_features || []),
          // Ensure osquery is enabled
          {
            name: 'osquery',
            enabled: true,
          }
        ].reduce((acc, feature) => {
          // Deduplicate by name, keeping the last one
          const existing = acc.find(f => f.name === feature.name);
          if (existing) {
            existing.enabled = feature.enabled;
          } else {
            acc.push(feature);
          }
          return acc;
        }, [] as Array<{ name: string; enabled: boolean }>),
        package_policies: [], // Don't clone package policies, they'll be added separately
        is_managed: false,
        is_default: false,
        is_default_fleet_server: false,
      };

      const clonedPolicy = await this.fleet.agentPolicyService.asCurrentUser.create(
        this.soClient,
        newAgentPolicy
      );

      this.logger.info(`Successfully cloned agent policy ${sourcePolicyId} to ${clonedPolicy.id}`);

      return {
        success: true,
        clonedPolicy,
      };

    } catch (error) {
      this.logger.error(`Failed to clone agent policy ${sourcePolicyId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}