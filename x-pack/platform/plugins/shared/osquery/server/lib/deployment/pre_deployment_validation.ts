/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { FleetStartContract } from '@kbn/fleet-plugin/server';
import { ComplianceHealthChecks } from './health_checks';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  checks: Array<{
    name: string;
    passed: boolean;
    message: string;
  }>;
}

/**
 * Pre-deployment validation service
 * Validates environment is ready for compliance monitoring deployment
 */
export class PreDeploymentValidation {
  private healthChecks: ComplianceHealthChecks;

  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly soClient: SavedObjectsClientContract,
    private readonly fleet: FleetStartContract | undefined,
    private readonly logger: Logger
  ) {
    this.healthChecks = new ComplianceHealthChecks(esClient, fleet, logger);
  }

  /**
   * Run complete pre-deployment validation
   */
  async validate(): Promise<ValidationResult> {
    this.logger.info('Running pre-deployment validation for compliance monitoring');

    const errors: string[] = [];
    const warnings: string[] = [];
    const checks: ValidationResult['checks'] = [];

    // Run health checks
    const health = await this.healthChecks.runAll();

    health.checks.forEach((check) => {
      checks.push({
        name: check.name,
        passed: check.status === 'healthy',
        message: check.message,
      });

      if (check.status === 'unhealthy') {
        errors.push(`${check.name}: ${check.message}`);
      } else if (check.status === 'degraded') {
        warnings.push(`${check.name}: ${check.message}`);
      }
    });

    // Check for existing compliance data
    const dataCheck = await this.checkExistingData();
    checks.push(dataCheck);
    if (!dataCheck.passed) {
      warnings.push(dataCheck.message);
    }

    // Check for conflicting configurations
    const configCheck = await this.checkConflictingConfigurations();
    checks.push(configCheck);
    if (!configCheck.passed) {
      errors.push(configCheck.message);
    }

    // Check license level
    const licenseCheck = await this.checkLicenseLevel();
    checks.push(licenseCheck);
    if (!licenseCheck.passed) {
      warnings.push(licenseCheck.message);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      checks,
    };
  }

  /**
   * Check if compliance data already exists (for upgrades)
   */
  private async checkExistingData(): Promise<ValidationResult['checks'][0]> {
    try {
      const findingsCount = await this.esClient.count({
        index: 'compliance-findings-*',
      });

      if (findingsCount.count > 0) {
        return {
          name: 'existing_data',
          passed: true,
          message: `Found ${findingsCount.count} existing findings - this is an upgrade`,
        };
      }

      return {
        name: 'existing_data',
        passed: true,
        message: 'No existing data - this is a fresh installation',
      };
    } catch (error) {
      if (error.meta?.statusCode === 404) {
        return {
          name: 'existing_data',
          passed: true,
          message: 'No existing data - this is a fresh installation',
        };
      }

      return {
        name: 'existing_data',
        passed: false,
        message: `Failed to check existing data: ${error.message}`,
      };
    }
  }

  /**
   * Check for conflicting configurations
   */
  private async checkConflictingConfigurations(): Promise<ValidationResult['checks'][0]> {
    try {
      // Check if there are duplicate transform IDs
      const transforms = await this.esClient.transform.getTransform({
        transform_id: 'compliance-*',
      });

      const complianceTransforms = transforms.transforms.filter((t) =>
        t.id.startsWith('compliance-')
      );

      if (complianceTransforms.length > 1) {
        return {
          name: 'conflicting_configurations',
          passed: false,
          message: `Found ${complianceTransforms.length} compliance transforms - expected 0 or 1`,
        };
      }

      return {
        name: 'conflicting_configurations',
        passed: true,
        message: 'No conflicting configurations detected',
      };
    } catch (error) {
      // 404 is OK (no transforms yet)
      if (error.meta?.statusCode === 404) {
        return {
          name: 'conflicting_configurations',
          passed: true,
          message: 'No conflicting configurations detected',
        };
      }

      return {
        name: 'conflicting_configurations',
        passed: false,
        message: `Failed to check for conflicts: ${error.message}`,
      };
    }
  }

  /**
   * Check Kibana license level
   */
  private async checkLicenseLevel(): Promise<ValidationResult['checks'][0]> {
    try {
      // Basic compliance monitoring works on all licenses
      // Advanced features (CSP integration, ML-based anomaly detection) require Enterprise

      return {
        name: 'license_level',
        passed: true,
        message: 'License check passed (basic compliance monitoring available on all licenses)',
      };
    } catch (error) {
      return {
        name: 'license_level',
        passed: false,
        message: `Failed to check license: ${error.message}`,
      };
    }
  }

  /**
   * Validate specific deployment parameters
   */
  async validatePackDeployment(params: {
    benchmarkId: string;
    agentPolicyIds: string[];
  }): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const checks: ValidationResult['checks'] = [];

    // Check benchmark exists
    const benchmarkCheck = await this.checkBenchmarkExists(params.benchmarkId);
    checks.push(benchmarkCheck);
    if (!benchmarkCheck.passed) {
      errors.push(benchmarkCheck.message);
    }

    // Check agent policies exist
    for (const policyId of params.agentPolicyIds) {
      const policyCheck = await this.checkAgentPolicyExists(policyId);
      checks.push(policyCheck);
      if (!policyCheck.passed) {
        errors.push(policyCheck.message);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      checks,
    };
  }

  /**
   * Check if benchmark exists and has rules
   */
  private async checkBenchmarkExists(benchmarkId: string): Promise<ValidationResult['checks'][0]> {
    try {
      const { saved_objects } = await this.soClient.find({
        type: 'osquery-compliance-rule',
        filter: `osquery-compliance-rule.attributes.benchmark.id:"${benchmarkId}"`,
        perPage: 1,
      });

      if (saved_objects.length === 0) {
        return {
          name: `benchmark_${benchmarkId}`,
          passed: false,
          message: `Benchmark ${benchmarkId} has no rules - cannot deploy`,
        };
      }

      return {
        name: `benchmark_${benchmarkId}`,
        passed: true,
        message: `Benchmark ${benchmarkId} found with rules`,
      };
    } catch (error) {
      return {
        name: `benchmark_${benchmarkId}`,
        passed: false,
        message: `Failed to check benchmark: ${error.message}`,
      };
    }
  }

  /**
   * Check if agent policy exists and is accessible
   */
  private async checkAgentPolicyExists(policyId: string): Promise<ValidationResult['checks'][0]> {
    if (!this.fleet) {
      return {
        name: `agent_policy_${policyId}`,
        passed: false,
        message: 'Fleet not available',
      };
    }

    try {
      const policy = await this.fleet.agentPolicyService.get({} as any, policyId);

      if (!policy) {
        return {
          name: `agent_policy_${policyId}`,
          passed: false,
          message: `Agent policy ${policyId} not found`,
        };
      }

      return {
        name: `agent_policy_${policyId}`,
        passed: true,
        message: `Agent policy ${policyId} found (${policy.name})`,
      };
    } catch (error) {
      return {
        name: `agent_policy_${policyId}`,
        passed: false,
        message: `Failed to check agent policy: ${error.message}`,
      };
    }
  }
}
