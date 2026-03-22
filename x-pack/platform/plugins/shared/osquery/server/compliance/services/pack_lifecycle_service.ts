/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { FleetStartContract } from '@kbn/fleet-plugin/server';
import type { ComplianceRuleMetadata } from '../../../common/compliance/types';
import { FleetPackDeploymentService } from './fleet_pack_deployment_service';
import { CompliancePackGenerationService } from './pack_generation_service';
import { ComplianceAgentPolicyManagementService } from './agent_policy_management_service';

interface PackLifecycleOptions {
  autoStart?: boolean;
  validateBeforeDeployment?: boolean;
  rollbackOnFailure?: boolean;
  maxDeploymentRetries?: number;
}

interface PackValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  queryCount: number;
  platforms: string[];
  estimatedResourceUsage: {
    cpuImpact: 'low' | 'medium' | 'high';
    memoryUsage: 'low' | 'medium' | 'high';
    networkTraffic: 'low' | 'medium' | 'high';
  };
}

interface PackDeploymentStatus {
  id: string;
  benchmarkId: string;
  status: 'draft' | 'validating' | 'deploying' | 'deployed' | 'failed' | 'updating' | 'removing';
  agentPolicyIds: string[];
  packagePolicyId?: string;
  createdAt: string;
  lastUpdated: string;
  deployedQueries: number;
  affectedAgents: number;
  validationResult?: PackValidationResult;
  deploymentHistory: Array<{
    action: 'created' | 'updated' | 'deployed' | 'failed' | 'removed';
    timestamp: string;
    details: string;
    user?: string;
  }>;
}

/**
 * Service for managing the complete lifecycle of compliance packs.
 * Handles creation, validation, deployment, updates, monitoring, and removal
 * of osquery packs for compliance monitoring.
 */
export class PackLifecycleService {
  private readonly packStates = new Map<string, PackDeploymentStatus>();

  constructor(
    private readonly fleet: FleetStartContract,
    private readonly soClient: SavedObjectsClientContract,
    private readonly logger: Logger,
    private readonly fleetPackService: FleetPackDeploymentService,
    private readonly packGenerationService: CompliancePackGenerationService,
    private readonly agentPolicyService: ComplianceAgentPolicyManagementService
  ) {}

  /**
   * Creates a new compliance pack from rules and manages its lifecycle
   */
  async createCompliancePack(
    benchmarkId: string,
    rules: ComplianceRuleMetadata[],
    agentPolicyIds: string[],
    options: PackLifecycleOptions = {}
  ): Promise<{
    success: boolean;
    packId?: string;
    status?: PackDeploymentStatus;
    error?: string;
  }> {
    const packId = `compliance-pack-${benchmarkId}-${Date.now()}`;
    
    this.logger.info(`Creating compliance pack ${packId} for benchmark ${benchmarkId}`);

    // Initialize pack status
    const initialStatus: PackDeploymentStatus = {
      id: packId,
      benchmarkId,
      status: 'draft',
      agentPolicyIds,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      deployedQueries: 0,
      affectedAgents: 0,
      deploymentHistory: [
        {
          action: 'created',
          timestamp: new Date().toISOString(),
          details: `Pack created with ${rules.length} rules for ${agentPolicyIds.length} agent policies`,
        }
      ],
    };

    this.packStates.set(packId, initialStatus);

    try {
      // Step 1: Validate agent policies
      this.updatePackStatus(packId, 'validating', 'Validating agent policies');

      const policyValidation = await this.agentPolicyService.validateAgentPoliciesForCompliance(agentPolicyIds);
      
      if (policyValidation.invalid.length > 0) {
        const error = `Invalid agent policies: ${policyValidation.invalid.map(p => `${p.policyId} (${p.reasons.join(', ')})`).join('; ')}`;
        this.updatePackStatus(packId, 'failed', error);
        return { success: false, packId, status: this.packStates.get(packId), error };
      }

      // Step 2: Validate pack configuration
      if (options.validateBeforeDeployment !== false) {
        const validation = await this.validatePackConfiguration(rules, agentPolicyIds);
        
        const updatedStatus = this.packStates.get(packId)!;
        updatedStatus.validationResult = validation;
        this.packStates.set(packId, updatedStatus);

        if (!validation.isValid) {
          const error = `Pack validation failed: ${validation.errors.join(', ')}`;
          this.updatePackStatus(packId, 'failed', error);
          return { success: false, packId, status: this.packStates.get(packId), error };
        }
      }

      // Step 3: Deploy pack if auto-start is enabled
      if (options.autoStart !== false) {
        const deploymentResult = await this.deployPackInternal(packId, rules, agentPolicyIds, options);
        
        if (!deploymentResult.success) {
          return { 
            success: false, 
            packId, 
            status: this.packStates.get(packId), 
            error: deploymentResult.error 
          };
        }
      }

      return {
        success: true,
        packId,
        status: this.packStates.get(packId),
      };

    } catch (error) {
      this.logger.error(`Failed to create compliance pack ${packId}:`, error);
      this.updatePackStatus(packId, 'failed', `Creation failed: ${error.message}`);
      
      return {
        success: false,
        packId,
        status: this.packStates.get(packId),
        error: error.message,
      };
    }
  }

  /**
   * Updates an existing compliance pack with new rules or configuration
   */
  async updateCompliancePack(
    packId: string,
    updates: {
      rules?: ComplianceRuleMetadata[];
      agentPolicyIds?: string[];
      options?: PackLifecycleOptions;
    }
  ): Promise<{
    success: boolean;
    status?: PackDeploymentStatus;
    error?: string;
  }> {
    const currentStatus = this.packStates.get(packId);
    
    if (!currentStatus) {
      return { success: false, error: `Pack ${packId} not found` };
    }

    if (currentStatus.status === 'updating' || currentStatus.status === 'deploying') {
      return { success: false, error: `Pack ${packId} is currently being updated` };
    }

    this.logger.info(`Updating compliance pack ${packId}`);
    this.updatePackStatus(packId, 'updating', 'Starting pack update');

    try {
      const { rules, agentPolicyIds, options = {} } = updates;
      
      // Use current values if not provided in updates
      const updatedRules = rules || await this.getCurrentPackRules(packId);
      const updatedPolicyIds = agentPolicyIds || currentStatus.agentPolicyIds;

      // Validate updates if validation is enabled
      if (options.validateBeforeDeployment !== false) {
        const validation = await this.validatePackConfiguration(updatedRules, updatedPolicyIds);
        
        if (!validation.isValid) {
          const error = `Pack update validation failed: ${validation.errors.join(', ')}`;
          this.updatePackStatus(packId, 'failed', error);
          return { success: false, status: this.packStates.get(packId), error };
        }

        const currentStatusForUpdate = this.packStates.get(packId)!;
        currentStatusForUpdate.validationResult = validation;
        this.packStates.set(packId, currentStatusForUpdate);
      }

      // Perform the update deployment
      const deploymentResult = await this.deployPackInternal(packId, updatedRules, updatedPolicyIds, options);
      
      if (!deploymentResult.success) {
        this.updatePackStatus(packId, 'failed', `Update deployment failed: ${deploymentResult.error}`);
        return { success: false, status: this.packStates.get(packId), error: deploymentResult.error };
      }

      this.updatePackStatus(packId, 'deployed', 'Pack updated successfully');

      return {
        success: true,
        status: this.packStates.get(packId),
      };

    } catch (error) {
      this.logger.error(`Failed to update compliance pack ${packId}:`, error);
      this.updatePackStatus(packId, 'failed', `Update failed: ${error.message}`);
      
      return {
        success: false,
        status: this.packStates.get(packId),
        error: error.message,
      };
    }
  }

  /**
   * Removes a compliance pack and cleans up all associated resources
   */
  async removeCompliancePack(packId: string, options: { force?: boolean } = {}): Promise<{
    success: boolean;
    status?: PackDeploymentStatus;
    error?: string;
  }> {
    const currentStatus = this.packStates.get(packId);
    
    if (!currentStatus) {
      return { success: false, error: `Pack ${packId} not found` };
    }

    if (!options.force && (currentStatus.status === 'updating' || currentStatus.status === 'deploying')) {
      return { success: false, error: `Pack ${packId} is busy. Use force=true to remove anyway.` };
    }

    this.logger.info(`Removing compliance pack ${packId}`);
    this.updatePackStatus(packId, 'removing', 'Starting pack removal');

    try {
      // Remove from Fleet if deployed
      if (currentStatus.packagePolicyId) {
        const removalResult = await this.fleetPackService.removeCompliancePack(
          currentStatus.benchmarkId
        );

        if (!removalResult.success && !options.force) {
          const error = `Failed to remove from Fleet: ${removalResult.errors.join(', ')}`;
          this.updatePackStatus(packId, 'failed', error);
          return { success: false, status: this.packStates.get(packId), error };
        }
      }

      // Clean up pack state
      this.updatePackStatus(packId, 'removed', 'Pack removed successfully');
      
      // Remove from memory after a delay to allow status queries
      setTimeout(() => {
        this.packStates.delete(packId);
      }, 60000); // Keep for 1 minute

      return {
        success: true,
        status: this.packStates.get(packId),
      };

    } catch (error) {
      this.logger.error(`Failed to remove compliance pack ${packId}:`, error);
      this.updatePackStatus(packId, 'failed', `Removal failed: ${error.message}`);
      
      return {
        success: false,
        status: this.packStates.get(packId),
        error: error.message,
      };
    }
  }

  /**
   * Validates pack configuration before deployment
   */
  async validatePackConfiguration(
    rules: ComplianceRuleMetadata[],
    agentPolicyIds: string[]
  ): Promise<PackValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate rules
      if (rules.length === 0) {
        errors.push('Pack contains no rules');
      }

      const enabledRules = rules.filter(r => r.enabled);
      if (enabledRules.length === 0) {
        errors.push('Pack contains no enabled rules');
      }

      // Validate agent policies
      if (agentPolicyIds.length === 0) {
        errors.push('No agent policies specified');
      }

      const policyValidation = await this.agentPolicyService.validateAgentPoliciesForCompliance(agentPolicyIds);
      if (policyValidation.invalid.length > 0) {
        errors.push(`Invalid agent policies: ${policyValidation.invalid.length} of ${agentPolicyIds.length}`);
      }

      // Generate pack preview for detailed validation
      const packPreview = await this.packGenerationService.generatePackPreview(enabledRules);
      
      if (packPreview.summary.invalidQueries > 0) {
        errors.push(`${packPreview.summary.invalidQueries} invalid queries found`);
      }

      if (packPreview.summary.validQueries > 50) {
        warnings.push(`High query count (${packPreview.summary.validQueries}) may impact performance`);
      }

      // Estimate resource usage
      const resourceUsage = this.estimateResourceUsage(enabledRules);

      // Check for potential performance issues
      const highFrequencyQueries = enabledRules.filter(r => (r.interval || 300) < 60);
      if (highFrequencyQueries.length > 10) {
        warnings.push(`${highFrequencyQueries.length} queries with high frequency (< 1min) may impact performance`);
      }

      const platforms = [...new Set(enabledRules.map(r => r.platform))];

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        queryCount: enabledRules.length,
        platforms,
        estimatedResourceUsage: resourceUsage,
      };

    } catch (error) {
      this.logger.error('Pack validation failed:', error);
      return {
        isValid: false,
        errors: [`Validation error: ${error.message}`],
        warnings,
        queryCount: 0,
        platforms: [],
        estimatedResourceUsage: { cpuImpact: 'high', memoryUsage: 'high', networkTraffic: 'high' },
      };
    }
  }

  /**
   * Gets the current status of a pack
   */
  getPackStatus(packId: string): PackDeploymentStatus | null {
    return this.packStates.get(packId) || null;
  }

  /**
   * Lists all managed packs
   */
  listManagedPacks(): PackDeploymentStatus[] {
    return Array.from(this.packStates.values());
  }

  /**
   * Gets deployment statistics across all managed packs
   */
  getDeploymentStatistics(): {
    totalPacks: number;
    statusBreakdown: Record<string, number>;
    totalQueries: number;
    totalAgents: number;
    averageQueriesPerPack: number;
  } {
    const packs = Array.from(this.packStates.values());
    const statusBreakdown: Record<string, number> = {};
    
    let totalQueries = 0;
    let totalAgents = 0;

    for (const pack of packs) {
      statusBreakdown[pack.status] = (statusBreakdown[pack.status] || 0) + 1;
      totalQueries += pack.deployedQueries;
      totalAgents += pack.affectedAgents;
    }

    return {
      totalPacks: packs.length,
      statusBreakdown,
      totalQueries,
      totalAgents,
      averageQueriesPerPack: packs.length > 0 ? Math.round(totalQueries / packs.length) : 0,
    };
  }

  /**
   * Internal deployment method
   */
  private async deployPackInternal(
    packId: string,
    rules: ComplianceRuleMetadata[],
    agentPolicyIds: string[],
    options: PackLifecycleOptions
  ): Promise<{ success: boolean; error?: string }> {
    const currentStatus = this.packStates.get(packId)!;
    
    this.updatePackStatus(packId, 'deploying', 'Deploying pack to Fleet');

    const maxRetries = options.maxDeploymentRetries || 3;
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const deploymentResult = await this.fleetPackService.deployCompliancePack(
          rules,
          currentStatus.benchmarkId,
          {
            agentPolicyIds,
            enabled: true,
            force: attempt > 1, // Force on retries
          }
        );

        if (deploymentResult.success) {
          // Update status with deployment details
          const updatedStatus = this.packStates.get(packId)!;
          updatedStatus.packagePolicyId = deploymentResult.packagePolicyId;
          updatedStatus.deployedQueries = deploymentResult.deployedQueries;
          updatedStatus.status = 'deployed';
          
          // Calculate affected agents
          let totalAgents = 0;
          for (const policyId of agentPolicyIds) {
            const policyInfo = await this.agentPolicyService.getAgentPolicyComplianceInfo(policyId);
            totalAgents += policyInfo.policy?.agentCount || 0;
          }
          updatedStatus.affectedAgents = totalAgents;

          this.packStates.set(packId, updatedStatus);
          
          this.updatePackStatus(packId, 'deployed', `Pack deployed successfully on attempt ${attempt}`);
          
          return { success: true };
        } else {
          lastError = deploymentResult.errors.join(', ');
          this.logger.warn(`Deployment attempt ${attempt} failed: ${lastError}`);
          
          if (attempt < maxRetries) {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }

      } catch (error) {
        lastError = error.message;
        this.logger.error(`Deployment attempt ${attempt} error:`, error);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    // All retries failed
    if (options.rollbackOnFailure) {
      this.logger.info(`Rolling back pack ${packId} due to deployment failure`);
      // Rollback logic would go here
    }

    return { success: false, error: lastError || 'Deployment failed after all retries' };
  }

  /**
   * Updates pack status and history
   */
  private updatePackStatus(packId: string, status: PackDeploymentStatus['status'], details: string): void {
    const currentStatus = this.packStates.get(packId);
    if (!currentStatus) return;

    currentStatus.status = status;
    currentStatus.lastUpdated = new Date().toISOString();
    currentStatus.deploymentHistory.push({
      action: status === 'deployed' ? 'deployed' : status === 'failed' ? 'failed' : 'updated',
      timestamp: new Date().toISOString(),
      details,
    });

    this.packStates.set(packId, currentStatus);
  }

  /**
   * Gets current rules for a pack (placeholder - would integrate with rule storage)
   */
  private async getCurrentPackRules(packId: string): Promise<ComplianceRuleMetadata[]> {
    // This would retrieve the current rules associated with the pack
    // For now, return empty array
    return [];
  }

  /**
   * Estimates resource usage for a set of rules
   */
  private estimateResourceUsage(rules: ComplianceRuleMetadata[]): {
    cpuImpact: 'low' | 'medium' | 'high';
    memoryUsage: 'low' | 'medium' | 'high';
    networkTraffic: 'low' | 'medium' | 'high';
  } {
    const enabledRules = rules.filter(r => r.enabled);
    const totalQueries = enabledRules.length;
    const avgInterval = enabledRules.reduce((sum, r) => sum + (r.interval || 300), 0) / enabledRules.length;
    const complexQueries = enabledRules.filter(r => 
      r.osquery_query.toLowerCase().includes('join') || 
      r.osquery_query.length > 200
    ).length;

    // Simple heuristic-based estimation
    let cpuImpact: 'low' | 'medium' | 'high' = 'low';
    let memoryUsage: 'low' | 'medium' | 'high' = 'low';
    let networkTraffic: 'low' | 'medium' | 'high' = 'low';

    // CPU impact based on query count and frequency
    if (totalQueries > 30 || avgInterval < 120) {
      cpuImpact = 'high';
    } else if (totalQueries > 15 || avgInterval < 300) {
      cpuImpact = 'medium';
    }

    // Memory usage based on complex queries
    if (complexQueries > 10) {
      memoryUsage = 'high';
    } else if (complexQueries > 5) {
      memoryUsage = 'medium';
    }

    // Network traffic based on frequency and query count
    if ((totalQueries > 20 && avgInterval < 300) || avgInterval < 60) {
      networkTraffic = 'high';
    } else if (totalQueries > 10 && avgInterval < 600) {
      networkTraffic = 'medium';
    }

    return { cpuImpact, memoryUsage, networkTraffic };
  }
}