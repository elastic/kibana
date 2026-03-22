/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract, SavedObject } from '@kbn/core/server';
import semver from 'semver';
import type { 
  ComplianceRuleMetadata, 
  ComplianceBenchmarkMetadata,
  ComplianceRuleMigrationMetadata 
} from '../../../common/compliance/types';
import { COMPLIANCE_RULE_SO_TYPE } from '../../../common/compliance';
import { BenchmarkVersionService } from './benchmark_version_service';

interface RuleCreationOptions {
  validate: boolean;
  autoVersion: boolean;
  skipDuplicateCheck: boolean;
  migrationMetadata?: ComplianceRuleMigrationMetadata;
}

interface RuleImportOptions {
  overwriteExisting: boolean;
  validateVersionCompatibility: boolean;
  migrateOnVersionMismatch: boolean;
  batchSize: number;
}

interface RuleVersionValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestedVersion?: string;
  compatibilityIssues: Array<{
    field: string;
    issue: string;
    severity: 'error' | 'warning';
  }>;
}

interface RuleBatchImportResult {
  success: boolean;
  imported: number;
  updated: number;
  failed: number;
  results: Array<{
    ruleId: string;
    status: 'imported' | 'updated' | 'failed' | 'skipped';
    version?: string;
    error?: string;
    warnings: string[];
  }>;
  summary: {
    totalRules: number;
    newRules: number;
    updatedRules: number;
    migratedRules: number;
    failedRules: number;
    skippedRules: number;
  };
}

/**
 * Service for creating and importing compliance rules with comprehensive
 * version management, validation, and migration support.
 */
export class VersionedRuleManagementService {
  constructor(
    private readonly soClient: SavedObjectsClientContract,
    private readonly logger: Logger,
    private readonly versionService: BenchmarkVersionService
  ) {}

  /**
   * Creates a new compliance rule with version metadata
   */
  async createRule(
    ruleData: Omit<ComplianceRuleMetadata, 'rule_version' | 'rule_schema_version'>,
    options: RuleCreationOptions = {
      validate: true,
      autoVersion: true,
      skipDuplicateCheck: false,
    }
  ): Promise<{
    success: boolean;
    rule?: SavedObject<ComplianceRuleMetadata>;
    validation?: RuleVersionValidation;
    error?: string;
  }> {
    try {
      this.logger.info(`Creating compliance rule: ${ruleData.rule_id}`);

      // Check for existing rule if not skipping duplicate check
      if (!options.skipDuplicateCheck) {
        const existingRule = await this.findRuleById(ruleData.rule_id);
        if (existingRule) {
          return {
            success: false,
            error: `Rule with ID ${ruleData.rule_id} already exists`,
          };
        }
      }

      // Auto-generate version if enabled
      let ruleVersion = '1.0.0';
      if (options.autoVersion) {
        ruleVersion = await this.generateRuleVersion(ruleData);
      }

      // Validate benchmark version compatibility
      let validation: RuleVersionValidation | undefined;
      if (options.validate) {
        validation = await this.validateRuleVersion(ruleData, ruleVersion);
        if (!validation.isValid) {
          return {
            success: false,
            validation,
            error: `Rule validation failed: ${validation.errors.join(', ')}`,
          };
        }
      }

      // Enrich rule with version metadata
      const enrichedRule: ComplianceRuleMetadata = {
        ...ruleData,
        rule_version: ruleVersion,
        rule_schema_version: 2, // Current schema version
        source_rule_id: ruleData.rule_id, // Track original source
        migration_status: options.migrationMetadata ? 'completed' : undefined,
        migration_metadata: options.migrationMetadata,
        supported_benchmark_versions: this.determineSupportedVersions(ruleData.benchmark),
      };

      // Save the rule
      const savedRule = await this.soClient.create<ComplianceRuleMetadata>(
        COMPLIANCE_RULE_SO_TYPE,
        enrichedRule,
        {
          id: ruleData.rule_id,
          refresh: 'wait_for',
        }
      );

      this.logger.info(`Created rule ${ruleData.rule_id} with version ${ruleVersion}`);

      return {
        success: true,
        rule: savedRule,
        validation,
      };

    } catch (error) {
      this.logger.error(`Failed to create rule ${ruleData.rule_id}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Updates an existing rule with version management
   */
  async updateRule(
    ruleId: string,
    updates: Partial<ComplianceRuleMetadata>,
    updatedBy: string
  ): Promise<{
    success: boolean;
    rule?: SavedObject<ComplianceRuleMetadata>;
    newVersion?: string;
    error?: string;
  }> {
    try {
      const existingRule = await this.soClient.get<ComplianceRuleMetadata>(
        COMPLIANCE_RULE_SO_TYPE,
        ruleId
      );

      const currentVersion = existingRule.attributes.rule_version || '1.0.0';
      const newVersion = this.incrementRuleVersion(currentVersion, updates);

      // Prepare updated rule with version increment
      const updatedRule: ComplianceRuleMetadata = {
        ...existingRule.attributes,
        ...updates,
        rule_version: newVersion,
        migration_metadata: updates.migration_metadata || {
          migrated_from: currentVersion,
          migrated_at: new Date().toISOString(),
          migration_notes: `Updated by ${updatedBy}`,
        },
      };

      // Validate the updated rule
      const validation = await this.validateRuleVersion(updatedRule, newVersion);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Rule validation failed: ${validation.errors.join(', ')}`,
        };
      }

      const savedRule = await this.soClient.update<ComplianceRuleMetadata>(
        COMPLIANCE_RULE_SO_TYPE,
        ruleId,
        updatedRule,
        {
          version: existingRule.version,
          refresh: 'wait_for',
        }
      );

      this.logger.info(`Updated rule ${ruleId} from version ${currentVersion} to ${newVersion}`);

      return {
        success: true,
        rule: savedRule,
        newVersion,
      };

    } catch (error) {
      this.logger.error(`Failed to update rule ${ruleId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Imports rules in batch with version management and migration
   */
  async importRules(
    rules: ComplianceRuleMetadata[],
    options: RuleImportOptions = {
      overwriteExisting: false,
      validateVersionCompatibility: true,
      migrateOnVersionMismatch: true,
      batchSize: 50,
    }
  ): Promise<RuleBatchImportResult> {
    this.logger.info(`Starting batch import of ${rules.length} rules`);

    const result: RuleBatchImportResult = {
      success: true,
      imported: 0,
      updated: 0,
      failed: 0,
      results: [],
      summary: {
        totalRules: rules.length,
        newRules: 0,
        updatedRules: 0,
        migratedRules: 0,
        failedRules: 0,
        skippedRules: 0,
      },
    };

    // Process rules in batches
    const batches = this.chunkArray(rules, options.batchSize);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      this.logger.debug(`Processing batch ${i + 1}/${batches.length} (${batch.length} rules)`);

      await Promise.all(batch.map(async (rule) => {
        try {
          const importResult = await this.importSingleRule(rule, options);
          result.results.push(importResult);

          switch (importResult.status) {
            case 'imported':
              result.imported++;
              result.summary.newRules++;
              break;
            case 'updated':
              result.updated++;
              result.summary.updatedRules++;
              break;
            case 'failed':
              result.failed++;
              result.summary.failedRules++;
              result.success = false;
              break;
            case 'skipped':
              result.summary.skippedRules++;
              break;
          }

        } catch (error) {
          this.logger.error(`Failed to import rule ${rule.rule_id}:`, error);
          result.failed++;
          result.summary.failedRules++;
          result.success = false;
          
          result.results.push({
            ruleId: rule.rule_id,
            status: 'failed',
            error: error.message,
            warnings: [],
          });
        }
      }));

      // Brief delay between batches to avoid overwhelming the system
      if (i < batches.length - 1) {
        await this.delay(100);
      }
    }

    this.logger.info(`Batch import completed: ${result.imported} imported, ${result.updated} updated, ${result.failed} failed`);

    return result;
  }

  /**
   * Migrates rules to new benchmark version
   */
  async migrateRulesToBenchmarkVersion(
    benchmarkId: string,
    fromVersion: string,
    toVersion: string,
    migratedBy: string
  ): Promise<{
    success: boolean;
    migratedRules: number;
    failedRules: number;
    errors: string[];
  }> {
    this.logger.info(`Migrating rules for benchmark ${benchmarkId} from ${fromVersion} to ${toVersion}`);

    try {
      // Find all rules for this benchmark version
      const rulesResponse = await this.soClient.find<ComplianceRuleMetadata>({
        type: COMPLIANCE_RULE_SO_TYPE,
        filter: `benchmark.id: "${benchmarkId}" AND benchmark.version: "${fromVersion}"`,
        perPage: 1000,
      });

      const rules = rulesResponse.saved_objects;
      let migratedRules = 0;
      let failedRules = 0;
      const errors: string[] = [];

      for (const ruleObj of rules) {
        try {
          const rule = ruleObj.attributes;
          
          // Generate migration plan for this rule
          const migrationPlan = await this.versionService.generateMigrationPlan(
            benchmarkId,
            fromVersion,
            toVersion,
            [rule]
          );

          if (!migrationPlan.requiresMigration) {
            // Just update the benchmark version
            await this.updateRule(rule.rule_id, {
              benchmark: {
                ...rule.benchmark,
                version: toVersion,
              },
            }, migratedBy);
            migratedRules++;
            continue;
          }

          // Apply migration transformations
          const migratedRule = await this.applyRuleMigration(rule, toVersion, migrationPlan);
          
          await this.updateRule(rule.rule_id, migratedRule, migratedBy);
          migratedRules++;

        } catch (error) {
          failedRules++;
          errors.push(`Rule ${ruleObj.attributes.rule_id}: ${error.message}`);
          this.logger.error(`Failed to migrate rule ${ruleObj.attributes.rule_id}:`, error);
        }
      }

      return {
        success: failedRules === 0,
        migratedRules,
        failedRules,
        errors,
      };

    } catch (error) {
      this.logger.error(`Migration failed for benchmark ${benchmarkId}:`, error);
      return {
        success: false,
        migratedRules: 0,
        failedRules: 0,
        errors: [error.message],
      };
    }
  }

  /**
   * Validates rule version compatibility
   */
  private async validateRuleVersion(
    rule: ComplianceRuleMetadata,
    ruleVersion: string
  ): Promise<RuleVersionValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const compatibilityIssues: RuleVersionValidation['compatibilityIssues'] = [];

    // Validate semantic version format
    if (!semver.valid(ruleVersion)) {
      errors.push(`Invalid semantic version format: ${ruleVersion}`);
    }

    // Validate benchmark version compatibility
    if (rule.benchmark?.version) {
      const benchmarkVersion = rule.benchmark.version;
      const versionComparison = this.versionService.compareVersions(benchmarkVersion, ruleVersion);
      
      if (versionComparison.isBreakingChange) {
        compatibilityIssues.push({
          field: 'benchmark.version',
          issue: `Rule version ${ruleVersion} may not be compatible with benchmark version ${benchmarkVersion}`,
          severity: 'warning',
        });
      }
    }

    // Validate supported benchmark versions
    if (rule.supported_benchmark_versions?.length) {
      const isCompatible = rule.supported_benchmark_versions.some(supportedVersion => {
        try {
          return semver.satisfies(rule.benchmark.version, supportedVersion);
        } catch {
          return false;
        }
      });

      if (!isCompatible) {
        errors.push(`Current benchmark version ${rule.benchmark.version} is not in supported versions: ${rule.supported_benchmark_versions.join(', ')}`);
      }
    }

    // Validate query syntax (basic validation)
    if (!rule.query || rule.query.trim().length === 0) {
      errors.push('Rule query is required');
    } else if (!rule.query.toLowerCase().includes('select')) {
      warnings.push('Query does not appear to be a valid SQL SELECT statement');
    }

    // Validate platform compatibility
    if (rule.platform && !['linux', 'windows', 'darwin'].includes(rule.platform)) {
      errors.push(`Invalid platform: ${rule.platform}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      compatibilityIssues,
    };
  }

  /**
   * Generates appropriate version for a new rule
   */
  private async generateRuleVersion(rule: ComplianceRuleMetadata): Promise<string> {
    try {
      // Find the latest version for this rule family (same benchmark + section)
      const similarRulesResponse = await this.soClient.find<ComplianceRuleMetadata>({
        type: COMPLIANCE_RULE_SO_TYPE,
        filter: `benchmark.id: "${rule.benchmark.id}" AND section: "${rule.section}"`,
        sortField: 'rule_version',
        sortOrder: 'desc',
        perPage: 1,
      });

      if (similarRulesResponse.saved_objects.length > 0) {
        const latestRule = similarRulesResponse.saved_objects[0].attributes;
        const latestVersion = latestRule.rule_version || '1.0.0';
        
        // Increment patch version
        return semver.inc(latestVersion, 'patch') || '1.0.1';
      }

      // Start with benchmark version if no similar rules exist
      return rule.benchmark.version || '1.0.0';

    } catch (error) {
      this.logger.warn(`Failed to generate rule version, using default:`, error);
      return '1.0.0';
    }
  }

  /**
   * Increments rule version based on the type of changes
   */
  private incrementRuleVersion(
    currentVersion: string,
    updates: Partial<ComplianceRuleMetadata>
  ): string {
    try {
      // Determine increment type based on changes
      let incrementType: 'major' | 'minor' | 'patch' = 'patch';

      // Major changes: query modification, platform change
      if (updates.query || updates.platform) {
        incrementType = 'major';
      }
      // Minor changes: description, remediation, tags
      else if (updates.description || updates.remediation || updates.tags) {
        incrementType = 'minor';
      }
      // Patch changes: enabled/disabled, interval changes
      // (default is already 'patch')

      return semver.inc(currentVersion, incrementType) || currentVersion;

    } catch (error) {
      this.logger.warn(`Failed to increment version ${currentVersion}:`, error);
      return currentVersion;
    }
  }

  /**
   * Determines supported benchmark versions for a rule
   */
  private determineSupportedVersions(benchmark: ComplianceBenchmarkMetadata): string[] {
    const currentVersion = benchmark.version;
    
    try {
      // Support current version and compatible future patches/minors
      const major = semver.major(currentVersion);
      const minor = semver.minor(currentVersion);

      return [
        `${currentVersion}`, // Exact version
        `~${currentVersion}`, // Compatible patch versions
        `^${major}.${minor}.0`, // Compatible minor versions within same major
      ];

    } catch (error) {
      this.logger.warn(`Failed to determine supported versions for ${currentVersion}:`, error);
      return [currentVersion];
    }
  }

  /**
   * Imports a single rule with version handling
   */
  private async importSingleRule(
    rule: ComplianceRuleMetadata,
    options: RuleImportOptions
  ): Promise<RuleBatchImportResult['results'][0]> {
    const ruleId = rule.rule_id;
    const warnings: string[] = [];

    try {
      // Check if rule already exists
      const existingRule = await this.findRuleById(ruleId);

      if (existingRule && !options.overwriteExisting) {
        return {
          ruleId,
          status: 'skipped',
          warnings: ['Rule already exists and overwrite is disabled'],
        };
      }

      // Validate version compatibility if enabled
      if (options.validateVersionCompatibility) {
        const validation = await this.validateRuleVersion(rule, rule.rule_version || '1.0.0');
        warnings.push(...validation.warnings);
        
        if (!validation.isValid && !options.migrateOnVersionMismatch) {
          return {
            ruleId,
            status: 'failed',
            error: `Validation failed: ${validation.errors.join(', ')}`,
            warnings,
          };
        }
      }

      if (existingRule) {
        // Update existing rule
        const updateResult = await this.updateRule(ruleId, rule, 'import-system');
        
        return {
          ruleId,
          status: 'updated',
          version: updateResult.newVersion,
          warnings,
        };
      } else {
        // Create new rule
        const createResult = await this.createRule(rule, {
          validate: options.validateVersionCompatibility,
          autoVersion: true,
          skipDuplicateCheck: true,
        });

        if (!createResult.success) {
          return {
            ruleId,
            status: 'failed',
            error: createResult.error,
            warnings,
          };
        }

        return {
          ruleId,
          status: 'imported',
          version: createResult.rule?.attributes.rule_version,
          warnings,
        };
      }

    } catch (error) {
      return {
        ruleId,
        status: 'failed',
        error: error.message,
        warnings,
      };
    }
  }

  /**
   * Applies migration transformations to a rule
   */
  private async applyRuleMigration(
    rule: ComplianceRuleMetadata,
    targetVersion: string,
    migrationPlan: any
  ): Promise<Partial<ComplianceRuleMetadata>> {
    const migrated: Partial<ComplianceRuleMetadata> = {};

    // Update benchmark version
    migrated.benchmark = {
      ...rule.benchmark,
      version: targetVersion,
    };

    // Add migration metadata
    migrated.migration_metadata = {
      migrated_from: rule.benchmark.version,
      migrated_at: new Date().toISOString(),
      migration_notes: `Migrated to benchmark version ${targetVersion}`,
    };

    // Apply any query transformations based on migration plan
    // This would contain actual migration logic based on version changes
    if (migrationPlan.breakingChanges.length > 0) {
      migrated.migration_metadata.compatibility_issues = migrationPlan.breakingChanges.join('; ');
    }

    return migrated;
  }

  /**
   * Finds a rule by ID
   */
  private async findRuleById(ruleId: string): Promise<SavedObject<ComplianceRuleMetadata> | null> {
    try {
      return await this.soClient.get<ComplianceRuleMetadata>(COMPLIANCE_RULE_SO_TYPE, ruleId);
    } catch (error) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Chunks array into smaller batches
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}