/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { ComplianceRuleMetadata, CompliancePlatform } from '../../../common/compliance/types';
import { COMPLIANCE_SCHEDULE_ID_PREFIX } from '../../../common/compliance/constants';

interface OsqueryPackQuery {
  query: string;
  interval: number;
  platform?: string;
  description?: string;
  snapshot?: boolean;
  removed?: boolean;
  shard?: number;
  denylist?: boolean;
  value?: string;
}

interface OsqueryPack {
  queries: Record<string, OsqueryPackQuery>;
  shard?: number;
  version?: string;
  discovery?: string[];
  platform?: string;
}

interface PackGenerationOptions {
  includeDisabled?: boolean;
  platform?: CompliancePlatform;
  interval?: number;
  snapshot?: boolean;
  addDecorations?: boolean;
  groupBySection?: boolean;
}

interface PackGenerationResult {
  pack: OsqueryPack;
  metadata: {
    benchmarkId: string;
    benchmarkName: string;
    benchmarkVersion: string;
    totalRules: number;
    enabledRules: number;
    queryCount: number;
    platforms: string[];
    sections: string[];
    generatedAt: string;
  };
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
}

/**
 * Service for generating osquery packs from compliance rules.
 * Handles the conversion from compliance rule definitions to 
 * osquery pack format with proper scheduling and platform targeting.
 */
export class CompliancePackGenerationService {
  private readonly maxQueryNameLength = 255;
  private readonly maxQueryLength = 2048;
  private readonly minInterval = 60; // 1 minute
  private readonly maxInterval = 86400; // 24 hours
  
  constructor(
    private readonly soClient: SavedObjectsClientContract,
    private readonly logger: Logger
  ) {}

  /**
   * Generates an osquery pack from compliance rules for a specific benchmark
   */
  async generatePackFromBenchmark(
    benchmarkId: string,
    options: PackGenerationOptions = {}
  ): Promise<PackGenerationResult> {
    this.logger.info(`Generating osquery pack for benchmark: ${benchmarkId}`);

    const {
      includeDisabled = false,
      platform,
      interval: defaultInterval = 300,
      snapshot = false,
      addDecorations = true,
      groupBySection = false,
    } = options;

    try {
      // Get rules for the benchmark
      const rules = await this.getRulesForBenchmark(benchmarkId, {
        includeDisabled,
        platform,
      });

      if (rules.length === 0) {
        return this.createEmptyPackResult(benchmarkId, 'No rules found for benchmark');
      }

      // Generate pack structure
      const pack = await this.buildPackFromRules(rules, {
        defaultInterval,
        snapshot,
        addDecorations,
        groupBySection,
      });

      // Create metadata
      const metadata = this.generatePackMetadata(rules, benchmarkId);
      
      // Validate pack
      const validation = this.validatePack(pack, rules);

      const result: PackGenerationResult = {
        pack,
        metadata,
        validation,
      };

      this.logger.info(
        `Generated pack with ${metadata.queryCount} queries from ${metadata.enabledRules} enabled rules`
      );

      return result;

    } catch (error) {
      this.logger.error(`Failed to generate pack for benchmark ${benchmarkId}:`, error);
      return this.createEmptyPackResult(benchmarkId, `Generation failed: ${error.message}`);
    }
  }

  /**
   * Generates osquery packs for multiple benchmarks
   */
  async generatePacksForMultipleBenchmarks(
    benchmarkIds: string[],
    options: PackGenerationOptions = {}
  ): Promise<{
    packs: Record<string, PackGenerationResult>;
    summary: {
      total: number;
      successful: number;
      failed: number;
      totalQueries: number;
    };
  }> {
    const packs: Record<string, PackGenerationResult> = {};
    let successful = 0;
    let failed = 0;
    let totalQueries = 0;

    for (const benchmarkId of benchmarkIds) {
      try {
        const result = await this.generatePackFromBenchmark(benchmarkId, options);
        packs[benchmarkId] = result;
        
        if (result.validation.valid) {
          successful++;
          totalQueries += result.metadata.queryCount;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
        packs[benchmarkId] = this.createEmptyPackResult(
          benchmarkId, 
          `Generation failed: ${error.message}`
        );
      }
    }

    return {
      packs,
      summary: {
        total: benchmarkIds.length,
        successful,
        failed,
        totalQueries,
      },
    };
  }

  /**
   * Generates a preview of what queries would be included in a pack
   */
  async generatePackPreview(
    rules: ComplianceRuleMetadata[],
    options: PackGenerationOptions = {}
  ): Promise<{
    queries: Array<{
      name: string;
      query: string;
      interval: number;
      platform?: string;
      section: string;
      ruleId: string;
      enabled: boolean;
      issues: string[];
    }>;
    summary: {
      totalRules: number;
      validQueries: number;
      invalidQueries: number;
      platforms: string[];
      sections: string[];
    };
  }> {
    const queries = [];
    const platforms = new Set<string>();
    const sections = new Set<string>();
    let validQueries = 0;
    let invalidQueries = 0;

    for (const rule of rules) {
      if (!options.includeDisabled && !rule.enabled) {
        continue;
      }

      if (options.platform && rule.platform !== options.platform) {
        continue;
      }

      platforms.add(rule.platform);
      sections.add(rule.section);

      const queryName = this.generateQueryName(rule, options.groupBySection);
      const issues = this.validateRule(rule);
      const isValid = issues.length === 0;

      if (isValid) {
        validQueries++;
      } else {
        invalidQueries++;
      }

      queries.push({
        name: queryName,
        query: rule.osquery_query,
        interval: rule.interval || options.interval || 300,
        platform: rule.platform,
        section: rule.section,
        ruleId: rule.id,
        enabled: rule.enabled,
        issues,
      });
    }

    return {
      queries,
      summary: {
        totalRules: rules.length,
        validQueries,
        invalidQueries,
        platforms: Array.from(platforms),
        sections: Array.from(sections),
      },
    };
  }

  /**
   * Optimizes a pack by analyzing query performance and adjusting intervals
   */
  async optimizePackScheduling(
    pack: OsqueryPack,
    performanceData?: Record<string, {
      averageExecutionTime: number;
      errorRate: number;
      resultCount: number;
    }>
  ): Promise<{
    optimizedPack: OsqueryPack;
    changes: Array<{
      queryName: string;
      originalInterval: number;
      optimizedInterval: number;
      reason: string;
    }>;
  }> {
    const optimizedPack = JSON.parse(JSON.stringify(pack)) as OsqueryPack;
    const changes = [];

    for (const [queryName, query] of Object.entries(pack.queries)) {
      const performance = performanceData?.[queryName];
      let newInterval = query.interval;
      let reason = '';

      if (performance) {
        // Increase interval for slow queries
        if (performance.averageExecutionTime > 30000) { // 30 seconds
          newInterval = Math.max(newInterval * 2, 600); // At least 10 minutes
          reason = 'Increased interval due to slow execution time';
        }

        // Increase interval for high error rate queries
        if (performance.errorRate > 0.1) { // 10% error rate
          newInterval = Math.max(newInterval * 1.5, 300);
          reason = reason ? `${reason}; high error rate` : 'Increased interval due to high error rate';
        }

        // Decrease interval for fast, reliable queries that return few results
        if (
          performance.averageExecutionTime < 1000 && // Fast execution
          performance.errorRate < 0.01 && // Low error rate
          performance.resultCount < 10 // Few results
        ) {
          newInterval = Math.max(newInterval * 0.8, this.minInterval);
          reason = 'Decreased interval for fast, reliable query';
        }
      }

      // Apply system limits
      newInterval = Math.max(this.minInterval, Math.min(this.maxInterval, newInterval));

      if (newInterval !== query.interval) {
        optimizedPack.queries[queryName].interval = newInterval;
        changes.push({
          queryName,
          originalInterval: query.interval,
          optimizedInterval: newInterval,
          reason,
        });
      }
    }

    this.logger.info(`Pack optimization completed. Made ${changes.length} scheduling changes.`);

    return {
      optimizedPack,
      changes,
    };
  }

  /**
   * Retrieves compliance rules for a benchmark
   */
  private async getRulesForBenchmark(
    benchmarkId: string,
    options: { includeDisabled?: boolean; platform?: string }
  ): Promise<ComplianceRuleMetadata[]> {
    // This would integrate with the compliance rules service
    // For now, return empty array as placeholder
    this.logger.debug(`Retrieving rules for benchmark ${benchmarkId}`);
    return [];
  }

  /**
   * Builds the osquery pack structure from rules
   */
  private async buildPackFromRules(
    rules: ComplianceRuleMetadata[],
    options: {
      defaultInterval: number;
      snapshot: boolean;
      addDecorations: boolean;
      groupBySection: boolean;
    }
  ): Promise<OsqueryPack> {
    const queries: Record<string, OsqueryPackQuery> = {};

    for (const rule of rules) {
      if (!rule.enabled) {
        continue;
      }

      const queryName = this.generateQueryName(rule, options.groupBySection);
      let query = rule.osquery_query;

      // Add decorations if requested
      if (options.addDecorations) {
        query = this.addQueryDecorations(query);
      }

      queries[queryName] = {
        query,
        interval: rule.interval || options.defaultInterval,
        platform: rule.platform === 'all' ? undefined : rule.platform,
        description: `${rule.name} - ${rule.section}`,
        snapshot: options.snapshot,
        removed: false,
      };
    }

    return {
      queries,
      version: '1.0.0',
      platform: this.determinePlatformFromRules(rules),
    };
  }

  /**
   * Generates a unique query name for a rule
   */
  private generateQueryName(rule: ComplianceRuleMetadata, groupBySection: boolean): string {
    let name = `${COMPLIANCE_SCHEDULE_ID_PREFIX}${rule.benchmark.id}_${rule.rule_number || rule.id}`;
    
    if (groupBySection) {
      const section = rule.section.replace(/[^\w]/g, '_').toLowerCase();
      name = `${COMPLIANCE_SCHEDULE_ID_PREFIX}${rule.benchmark.id}_${section}_${rule.rule_number || rule.id}`;
    }

    // Truncate if too long
    if (name.length > this.maxQueryNameLength) {
      const hash = this.generateShortHash(name);
      name = name.substring(0, this.maxQueryNameLength - hash.length - 1) + '_' + hash;
    }

    return name;
  }

  /**
   * Adds decorations to osquery query for better data collection
   */
  private addQueryDecorations(query: string): string {
    // Add hostname and UUID decorations if not already present
    if (!query.includes('SELECT') || query.toLowerCase().includes('join')) {
      return query; // Don't modify complex queries
    }

    // Simple decoration addition - in practice this would be more sophisticated
    return query.replace(
      /SELECT\s+/i,
      "SELECT *, (SELECT hostname FROM system_info LIMIT 1) as hostname, (SELECT uuid FROM system_info LIMIT 1) as uuid, "
    );
  }

  /**
   * Determines the platform for the pack based on rules
   */
  private determinePlatformFromRules(rules: ComplianceRuleMetadata[]): string | undefined {
    const platforms = [...new Set(rules.map(rule => rule.platform))];
    
    if (platforms.length === 1 && platforms[0] !== 'all') {
      return platforms[0];
    }
    
    return undefined; // Mixed platforms or 'all' platform
  }

  /**
   * Validates a rule for pack inclusion
   */
  private validateRule(rule: ComplianceRuleMetadata): string[] {
    const issues: string[] = [];

    if (!rule.osquery_query || rule.osquery_query.trim().length === 0) {
      issues.push('Empty osquery query');
    }

    if (rule.osquery_query && rule.osquery_query.length > this.maxQueryLength) {
      issues.push(`Query too long (${rule.osquery_query.length} > ${this.maxQueryLength})`);
    }

    if (!rule.osquery_query?.toLowerCase().includes('select')) {
      issues.push('Query does not contain SELECT statement');
    }

    if (rule.interval && (rule.interval < this.minInterval || rule.interval > this.maxInterval)) {
      issues.push(`Invalid interval (${rule.interval}). Must be between ${this.minInterval} and ${this.maxInterval}`);
    }

    if (!rule.platform || !['darwin', 'windows', 'linux', 'all'].includes(rule.platform)) {
      issues.push(`Invalid platform: ${rule.platform}`);
    }

    return issues;
  }

  /**
   * Validates the generated pack
   */
  private validatePack(pack: OsqueryPack, rules: ComplianceRuleMetadata[]): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!pack.queries || Object.keys(pack.queries).length === 0) {
      errors.push('Pack contains no queries');
    }

    // Validate each query
    for (const [queryName, query] of Object.entries(pack.queries)) {
      if (!query.query || query.query.trim().length === 0) {
        errors.push(`Query '${queryName}' has empty query string`);
      }

      if (query.interval < this.minInterval) {
        warnings.push(`Query '${queryName}' has interval below minimum (${query.interval})`);
      }

      if (query.query && query.query.length > this.maxQueryLength) {
        errors.push(`Query '${queryName}' exceeds maximum length`);
      }
    }

    // Check for duplicate queries
    const queryStrings = Object.values(pack.queries).map(q => q.query);
    const uniqueQueries = new Set(queryStrings);
    if (queryStrings.length !== uniqueQueries.size) {
      warnings.push('Pack contains duplicate queries');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Generates pack metadata
   */
  private generatePackMetadata(
    rules: ComplianceRuleMetadata[],
    benchmarkId: string
  ): PackGenerationResult['metadata'] {
    const enabledRules = rules.filter(r => r.enabled);
    const platforms = [...new Set(rules.map(r => r.platform))];
    const sections = [...new Set(rules.map(r => r.section))];
    
    // Get benchmark info from first rule
    const firstRule = rules[0];
    
    return {
      benchmarkId,
      benchmarkName: firstRule?.benchmark?.name || benchmarkId,
      benchmarkVersion: firstRule?.benchmark?.version || '1.0.0',
      totalRules: rules.length,
      enabledRules: enabledRules.length,
      queryCount: enabledRules.length,
      platforms,
      sections,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Creates an empty pack result for error cases
   */
  private createEmptyPackResult(benchmarkId: string, errorMessage: string): PackGenerationResult {
    return {
      pack: { queries: {} },
      metadata: {
        benchmarkId,
        benchmarkName: benchmarkId,
        benchmarkVersion: '1.0.0',
        totalRules: 0,
        enabledRules: 0,
        queryCount: 0,
        platforms: [],
        sections: [],
        generatedAt: new Date().toISOString(),
      },
      validation: {
        valid: false,
        errors: [errorMessage],
        warnings: [],
      },
    };
  }

  /**
   * Generates a short hash for truncated names
   */
  private generateShortHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 6);
  }
}