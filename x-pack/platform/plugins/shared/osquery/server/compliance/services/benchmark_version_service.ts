/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import semver from 'semver';
import type { 
  ComplianceBenchmarkMetadata, 
  ComplianceBenchmarkVersionInfo,
  ComplianceRuleMetadata,
  ComplianceRuleMigrationMetadata
} from '../../../common/compliance/types';

interface BenchmarkVersionComparison {
  current: string;
  target: string;
  comparison: 'major' | 'minor' | 'patch' | 'equal';
  isUpgrade: boolean;
  isBreakingChange: boolean;
  compatibilityStatus: 'compatible' | 'deprecated' | 'incompatible';
}

interface VersionMigrationPlan {
  benchmarkId: string;
  fromVersion: string;
  toVersion: string;
  requiresMigration: boolean;
  migrationSteps: VersionMigrationStep[];
  affectedRules: Array<{
    ruleId: string;
    action: 'migrate' | 'deprecate' | 'remove' | 'update';
    details: string;
  }>;
  breakingChanges: string[];
  estimatedDuration: number; // minutes
}

interface VersionMigrationStep {
  step: number;
  title: string;
  description: string;
  type: 'schema' | 'data' | 'validation' | 'cleanup';
  automated: boolean;
  rollbackable: boolean;
}

/**
 * Service for managing benchmark versions and rule compatibility.
 * Handles version comparisons, migrations, deprecation workflows,
 * and backward compatibility validation for compliance benchmarks.
 */
export class BenchmarkVersionService {
  private readonly VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?$/;
  
  constructor(
    private readonly soClient: SavedObjectsClientContract,
    private readonly logger: Logger
  ) {}

  /**
   * Parses and validates semantic version strings
   */
  parseVersion(versionString: string): {
    major: number;
    minor: number;
    patch: number;
    prerelease?: string;
    isValid: boolean;
  } {
    if (!semver.valid(versionString)) {
      return {
        major: 0,
        minor: 0,
        patch: 0,
        isValid: false,
      };
    }

    const parsed = semver.parse(versionString);
    if (!parsed) {
      return {
        major: 0,
        minor: 0,
        patch: 0,
        isValid: false,
      };
    }

    return {
      major: parsed.major,
      minor: parsed.minor,
      patch: parsed.patch,
      prerelease: parsed.prerelease.length > 0 ? parsed.prerelease.join('.') : undefined,
      isValid: true,
    };
  }

  /**
   * Compares two benchmark versions and returns detailed comparison info
   */
  compareVersions(currentVersion: string, targetVersion: string): BenchmarkVersionComparison {
    const comparison = semver.compare(currentVersion, targetVersion);
    const diff = semver.diff(currentVersion, targetVersion);
    
    let compatibilityStatus: 'compatible' | 'deprecated' | 'incompatible' = 'compatible';
    let isBreakingChange = false;

    // Determine compatibility based on semantic versioning rules
    if (diff === 'major') {
      compatibilityStatus = 'incompatible';
      isBreakingChange = true;
    } else if (diff === 'minor' && comparison < 0) {
      // Upgrading minor version - usually compatible but may have deprecations
      const currentMajor = semver.major(currentVersion);
      const targetMajor = semver.major(targetVersion);
      
      if (currentMajor !== targetMajor) {
        compatibilityStatus = 'incompatible';
        isBreakingChange = true;
      }
    } else if (comparison < 0) {
      // Target is newer - check if current is deprecated
      const versionAge = semver.diff(currentVersion, targetVersion);
      if (versionAge === 'major') {
        compatibilityStatus = 'deprecated';
      }
    }

    return {
      current: currentVersion,
      target: targetVersion,
      comparison: (diff || 'equal') as 'major' | 'minor' | 'patch' | 'equal',
      isUpgrade: comparison < 0,
      isBreakingChange,
      compatibilityStatus,
    };
  }

  /**
   * Generates a migration plan for upgrading from one benchmark version to another
   */
  async generateMigrationPlan(
    benchmarkId: string,
    fromVersion: string,
    toVersion: string,
    existingRules: ComplianceRuleMetadata[]
  ): Promise<VersionMigrationPlan> {
    this.logger.info(`Generating migration plan: ${benchmarkId} ${fromVersion} -> ${toVersion}`);

    const versionComparison = this.compareVersions(fromVersion, toVersion);
    const migrationSteps: VersionMigrationStep[] = [];
    const affectedRules: VersionMigrationPlan['affectedRules'] = [];
    const breakingChanges: string[] = [];

    // Determine if migration is required
    const requiresMigration = versionComparison.isUpgrade && 
      (versionComparison.comparison === 'major' || versionComparison.comparison === 'minor');

    if (!requiresMigration) {
      return {
        benchmarkId,
        fromVersion,
        toVersion,
        requiresMigration: false,
        migrationSteps: [],
        affectedRules: [],
        breakingChanges: [],
        estimatedDuration: 0,
      };
    }

    // Step 1: Schema validation and updates
    migrationSteps.push({
      step: 1,
      title: 'Validate benchmark schema compatibility',
      description: 'Check if existing rule schema is compatible with new benchmark version',
      type: 'schema',
      automated: true,
      rollbackable: true,
    });

    // Step 2: Analyze rule compatibility
    migrationSteps.push({
      step: 2,
      title: 'Analyze rule compatibility',
      description: 'Identify rules that need updates, deprecation, or removal',
      type: 'validation',
      automated: true,
      rollbackable: true,
    });

    // Analyze each existing rule
    for (const rule of existingRules) {
      const ruleCompatibility = this.analyzeRuleCompatibility(rule, toVersion);
      
      if (ruleCompatibility.action !== 'none') {
        affectedRules.push({
          ruleId: rule.rule_id,
          action: ruleCompatibility.action,
          details: ruleCompatibility.reason,
        });

        if (ruleCompatibility.isBreaking) {
          breakingChanges.push(`Rule ${rule.rule_id}: ${ruleCompatibility.reason}`);
        }
      }
    }

    // Step 3: Data migration
    if (affectedRules.length > 0) {
      migrationSteps.push({
        step: 3,
        title: 'Migrate rule data',
        description: `Update ${affectedRules.length} rules for new benchmark version`,
        type: 'data',
        automated: true,
        rollbackable: true,
      });
    }

    // Step 4: Major version breaking changes
    if (versionComparison.comparison === 'major') {
      migrationSteps.push({
        step: migrationSteps.length + 1,
        title: 'Handle breaking changes',
        description: 'Process major version breaking changes and deprecated features',
        type: 'data',
        automated: false, // May require manual intervention
        rollbackable: false,
      });

      breakingChanges.push('Major version upgrade may introduce breaking changes');
    }

    // Step 5: Validation and cleanup
    migrationSteps.push({
      step: migrationSteps.length + 1,
      title: 'Validate migration results',
      description: 'Verify all rules are correctly migrated and functional',
      type: 'validation',
      automated: true,
      rollbackable: false,
    });

    migrationSteps.push({
      step: migrationSteps.length + 1,
      title: 'Cleanup deprecated data',
      description: 'Remove obsolete rule versions and temporary migration data',
      type: 'cleanup',
      automated: true,
      rollbackable: false,
    });

    // Estimate duration based on complexity
    const baseDuration = 5; // Base 5 minutes
    const ruleComplexity = affectedRules.length * 0.5; // 30 seconds per affected rule
    const versionComplexity = versionComparison.comparison === 'major' ? 10 : 2;
    const estimatedDuration = Math.ceil(baseDuration + ruleComplexity + versionComplexity);

    return {
      benchmarkId,
      fromVersion,
      toVersion,
      requiresMigration,
      migrationSteps,
      affectedRules,
      breakingChanges,
      estimatedDuration,
    };
  }

  /**
   * Executes a version migration plan
   */
  async executeMigration(
    migrationPlan: VersionMigrationPlan,
    options: {
      dryRun?: boolean;
      continueOnError?: boolean;
      backupBeforeMigration?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    completedSteps: number;
    totalSteps: number;
    errors: string[];
    warnings: string[];
    migratedRules: string[];
    rollbackData?: any;
  }> {
    const { dryRun = false, continueOnError = false, backupBeforeMigration = true } = options;
    
    this.logger.info(`${dryRun ? 'Simulating' : 'Executing'} migration: ${migrationPlan.benchmarkId} ${migrationPlan.fromVersion} -> ${migrationPlan.toVersion}`);

    const errors: string[] = [];
    const warnings: string[] = [];
    const migratedRules: string[] = [];
    let completedSteps = 0;
    let rollbackData: any = null;

    if (!migrationPlan.requiresMigration) {
      return {
        success: true,
        completedSteps: 0,
        totalSteps: 0,
        errors: [],
        warnings: ['No migration required'],
        migratedRules: [],
      };
    }

    try {
      // Create backup if requested
      if (backupBeforeMigration && !dryRun) {
        rollbackData = await this.createMigrationBackup(migrationPlan.benchmarkId);
        this.logger.info('Migration backup created');
      }

      // Execute each migration step
      for (const step of migrationPlan.migrationSteps) {
        try {
          this.logger.debug(`Executing migration step ${step.step}: ${step.title}`);
          
          if (dryRun) {
            this.logger.info(`[DRY RUN] Would execute: ${step.description}`);
          } else {
            await this.executeMigrationStep(step, migrationPlan);
          }

          completedSteps++;
        } catch (error) {
          const errorMessage = `Step ${step.step} failed: ${error.message}`;
          errors.push(errorMessage);
          this.logger.error(errorMessage, error);

          if (!continueOnError) {
            break;
          }
        }
      }

      // Migrate affected rules
      for (const affectedRule of migrationPlan.affectedRules) {
        try {
          if (dryRun) {
            this.logger.info(`[DRY RUN] Would ${affectedRule.action} rule: ${affectedRule.ruleId}`);
          } else {
            await this.migrateRule(affectedRule.ruleId, affectedRule.action, migrationPlan.toVersion);
            migratedRules.push(affectedRule.ruleId);
          }
        } catch (error) {
          const errorMessage = `Failed to migrate rule ${affectedRule.ruleId}: ${error.message}`;
          errors.push(errorMessage);
          this.logger.error(errorMessage, error);

          if (!continueOnError) {
            break;
          }
        }
      }

      const success = errors.length === 0 || (continueOnError && completedSteps > 0);

      if (success && !dryRun) {
        this.logger.info(`Migration completed successfully: ${migratedRules.length} rules migrated`);
      } else if (errors.length > 0) {
        this.logger.error(`Migration completed with ${errors.length} errors`);
      }

      return {
        success,
        completedSteps,
        totalSteps: migrationPlan.migrationSteps.length,
        errors,
        warnings,
        migratedRules,
        rollbackData,
      };

    } catch (error) {
      this.logger.error('Migration execution failed:', error);
      return {
        success: false,
        completedSteps,
        totalSteps: migrationPlan.migrationSteps.length,
        errors: [error.message],
        warnings,
        migratedRules,
        rollbackData,
      };
    }
  }

  /**
   * Lists all available versions for a benchmark
   */
  async listBenchmarkVersions(benchmarkId: string): Promise<{
    versions: Array<{
      version: string;
      versionInfo: ComplianceBenchmarkVersionInfo;
      ruleCount: number;
      status: 'current' | 'deprecated' | 'legacy';
    }>;
    currentVersion?: string;
    latestVersion?: string;
  }> {
    // This would query saved objects to find all versions of the benchmark
    // For now, return a mock structure
    return {
      versions: [],
      currentVersion: undefined,
      latestVersion: undefined,
    };
  }

  /**
   * Checks if a version is deprecated or approaching end-of-life
   */
  checkVersionDeprecation(
    version: string,
    availableVersions: string[],
    deprecationPolicy: {
      majorVersionLifetime: number; // months
      minorVersionLifetime: number; // months
    } = { majorVersionLifetime: 24, minorVersionLifetime: 12 }
  ): {
    isDeprecated: boolean;
    isEndOfLife: boolean;
    recommendedVersion?: string;
    deprecationDate?: string;
    endOfLifeDate?: string;
  } {
    const sortedVersions = availableVersions
      .filter(v => semver.valid(v))
      .sort((a, b) => semver.compare(b, a)); // Descending order

    const latestVersion = sortedVersions[0];
    const versionComparison = this.compareVersions(version, latestVersion);
    
    const isDeprecated = versionComparison.compatibilityStatus === 'deprecated' ||
      versionComparison.comparison === 'major';
    
    const isEndOfLife = versionComparison.compatibilityStatus === 'incompatible';

    return {
      isDeprecated,
      isEndOfLife,
      recommendedVersion: isDeprecated ? latestVersion : undefined,
      // These would be calculated based on actual release dates
      deprecationDate: undefined,
      endOfLifeDate: undefined,
    };
  }

  /**
   * Analyzes rule compatibility with a target benchmark version
   */
  private analyzeRuleCompatibility(
    rule: ComplianceRuleMetadata,
    targetVersion: string
  ): {
    action: 'migrate' | 'deprecate' | 'remove' | 'update' | 'none';
    reason: string;
    isBreaking: boolean;
  } {
    // Simple heuristic-based analysis
    // In a real implementation, this would use more sophisticated logic
    
    if (!rule.supported_benchmark_versions) {
      return {
        action: 'update',
        reason: 'Rule needs version compatibility metadata',
        isBreaking: false,
      };
    }

    if (rule.deprecated_in_version && semver.gte(targetVersion, rule.deprecated_in_version)) {
      return {
        action: 'deprecate',
        reason: `Rule deprecated in version ${rule.deprecated_in_version}`,
        isBreaking: true,
      };
    }

    if (rule.removed_in_version && semver.gte(targetVersion, rule.removed_in_version)) {
      return {
        action: 'remove',
        reason: `Rule removed in version ${rule.removed_in_version}`,
        isBreaking: true,
      };
    }

    const isSupported = rule.supported_benchmark_versions.some(v => semver.satisfies(targetVersion, v));
    
    if (!isSupported) {
      return {
        action: 'migrate',
        reason: 'Rule needs migration for version compatibility',
        isBreaking: false,
      };
    }

    return {
      action: 'none',
      reason: 'Rule is compatible',
      isBreaking: false,
    };
  }

  /**
   * Executes a single migration step
   */
  private async executeMigrationStep(
    step: VersionMigrationStep,
    migrationPlan: VersionMigrationPlan
  ): Promise<void> {
    switch (step.type) {
      case 'schema':
        await this.validateSchemaCompatibility(migrationPlan);
        break;
      case 'data':
        await this.migrateData(migrationPlan);
        break;
      case 'validation':
        await this.validateMigration(migrationPlan);
        break;
      case 'cleanup':
        await this.cleanupMigration(migrationPlan);
        break;
      default:
        throw new Error(`Unknown migration step type: ${step.type}`);
    }
  }

  /**
   * Validates schema compatibility
   */
  private async validateSchemaCompatibility(migrationPlan: VersionMigrationPlan): Promise<void> {
    // Schema validation logic would go here
    this.logger.debug('Validating schema compatibility');
  }

  /**
   * Migrates data for the new version
   */
  private async migrateData(migrationPlan: VersionMigrationPlan): Promise<void> {
    // Data migration logic would go here
    this.logger.debug('Migrating data');
  }

  /**
   * Validates migration results
   */
  private async validateMigration(migrationPlan: VersionMigrationPlan): Promise<void> {
    // Validation logic would go here
    this.logger.debug('Validating migration');
  }

  /**
   * Cleans up migration artifacts
   */
  private async cleanupMigration(migrationPlan: VersionMigrationPlan): Promise<void> {
    // Cleanup logic would go here
    this.logger.debug('Cleaning up migration');
  }

  /**
   * Migrates a specific rule
   */
  private async migrateRule(
    ruleId: string,
    action: 'migrate' | 'deprecate' | 'remove' | 'update',
    targetVersion: string
  ): Promise<void> {
    // Rule migration logic would go here
    this.logger.debug(`Migrating rule ${ruleId} with action: ${action}`);
  }

  /**
   * Creates a backup before migration
   */
  private async createMigrationBackup(benchmarkId: string): Promise<any> {
    // Backup creation logic would go here
    return { backupId: `backup-${benchmarkId}-${Date.now()}` };
  }
}