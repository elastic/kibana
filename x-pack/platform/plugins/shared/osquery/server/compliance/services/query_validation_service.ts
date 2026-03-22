/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

export interface QueryValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
  estimatedPerformance: 'fast' | 'medium' | 'slow';
  tables: string[];
}

export interface ValidationError {
  type: 'syntax' | 'security' | 'table' | 'performance';
  message: string;
  line?: number;
  column?: number;
}

export interface ValidationWarning {
  type: 'performance' | 'best_practice' | 'compatibility';
  message: string;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Service for validating osquery SQL queries
 * Checks syntax, security, performance, and best practices
 */
export class QueryValidationService {
  // Valid osquery tables (subset - expand as needed)
  private readonly VALID_TABLES = new Set([
    'processes',
    'users',
    'groups',
    'listening_ports',
    'file',
    'hash',
    'kernel_modules',
    'system_info',
    'os_version',
    'memory_info',
    'cpu_info',
    'disk_info',
    'interface_addresses',
    'routes',
    'arp_cache',
    'authorized_keys',
    'crontab',
    'docker_containers',
    'docker_images',
    'etc_hosts',
    'logged_in_users',
    'mounts',
    'password_policy',
    'services',
    'shell_history',
    'startup_items',
    'suid_bin',
    'certificates',
  ]);

  // Dangerous SQL operations
  private readonly DANGEROUS_OPERATIONS = [
    'DROP',
    'DELETE',
    'TRUNCATE',
    'ALTER',
    'CREATE',
    'INSERT',
    'UPDATE',
    'GRANT',
    'REVOKE',
  ];

  // Expensive operations that should be limited
  private readonly EXPENSIVE_OPERATIONS = ['JOIN', 'UNION', 'CROSS JOIN'];

  constructor(private readonly logger: Logger) {}

  /**
   * Validate osquery SQL query
   */
  async validateQuery(query: string, platform?: string): Promise<QueryValidationResult> {
    this.logger.debug(`Validating osquery query: ${query.substring(0, 100)}...`);

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];

    // Normalize query
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      errors.push({
        type: 'syntax',
        message: 'Query cannot be empty',
      });

      return {
        valid: false,
        errors,
        warnings,
        suggestions: [],
        estimatedPerformance: 'fast',
        tables: [],
      };
    }

    // Basic SQL syntax validation
    this.validateSyntax(normalizedQuery, errors, warnings);

    // Security validation
    this.validateSecurity(normalizedQuery, errors, warnings);

    // Table validation
    const tables = this.extractTables(normalizedQuery);
    this.validateTables(tables, platform, errors, warnings);

    // Performance validation
    const estimatedPerformance = this.validatePerformance(normalizedQuery, warnings, suggestions);

    // Best practices
    this.checkBestPractices(normalizedQuery, warnings, suggestions);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      estimatedPerformance,
      tables,
    };
  }

  /**
   * Validate SQL syntax
   */
  private validateSyntax(
    query: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Must start with SELECT
    if (!query.toUpperCase().startsWith('SELECT')) {
      errors.push({
        type: 'syntax',
        message: 'osquery queries must start with SELECT',
      });
    }

    // Check for balanced parentheses
    const openParens = (query.match(/\(/g) || []).length;
    const closeParens = (query.match(/\)/g) || []).length;

    if (openParens !== closeParens) {
      errors.push({
        type: 'syntax',
        message: `Unbalanced parentheses: ${openParens} open, ${closeParens} close`,
      });
    }

    // Check for semicolon at end
    if (!query.trim().endsWith(';')) {
      warnings.push({
        type: 'best_practice',
        message: 'Query should end with semicolon',
        severity: 'low',
      });
    }

    // Check for common SQL syntax errors
    if (query.toUpperCase().includes('SELECT *') && query.length > 100) {
      warnings.push({
        type: 'performance',
        message: 'SELECT * can be slow on large tables - specify column names',
        severity: 'medium',
      });
    }
  }

  /**
   * Validate query security
   */
  private validateSecurity(
    query: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const upperQuery = query.toUpperCase();

    // Check for dangerous operations
    for (const operation of this.DANGEROUS_OPERATIONS) {
      if (upperQuery.includes(operation)) {
        errors.push({
          type: 'security',
          message: `Dangerous operation detected: ${operation} - osquery is read-only`,
        });
      }
    }

    // Check for SQL injection patterns
    if (query.includes('--') && !query.includes('"--"') && !query.includes("'--'")) {
      warnings.push({
        type: 'security',
        message: 'Query contains SQL comment syntax (--) - ensure this is intentional',
        severity: 'medium',
      });
    }

    // Check for command injection attempts
    if (query.match(/[;`$]/g)) {
      const hasInjectionRisk =
        query.includes('`;') || query.includes('`$') || query.includes('$(');

      if (hasInjectionRisk) {
        errors.push({
          type: 'security',
          message: 'Query contains potential command injection patterns',
        });
      }
    }
  }

  /**
   * Extract table names from query
   */
  private extractTables(query: string): string[] {
    const tables: string[] = [];

    // Match FROM <table> and JOIN <table> patterns
    const fromMatches = query.matchAll(/FROM\s+(\w+)/gi);
    const joinMatches = query.matchAll(/JOIN\s+(\w+)/gi);

    for (const match of fromMatches) {
      if (match[1]) {
        tables.push(match[1].toLowerCase());
      }
    }

    for (const match of joinMatches) {
      if (match[1]) {
        tables.push(match[1].toLowerCase());
      }
    }

    return [...new Set(tables)]; // Deduplicate
  }

  /**
   * Validate table names are valid osquery tables
   */
  private validateTables(
    tables: string[],
    platform: string | undefined,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    for (const table of tables) {
      if (!this.VALID_TABLES.has(table)) {
        warnings.push({
          type: 'compatibility',
          message: `Table "${table}" may not be available on all platforms - verify osquery schema`,
          severity: 'medium',
        });
      }

      // Platform-specific table warnings
      if (platform === 'darwin' && table === 'apt_sources') {
        warnings.push({
          type: 'compatibility',
          message: `Table "${table}" is Linux-specific, not available on macOS`,
          severity: 'high',
        });
      }

      if (platform === 'linux' && table === 'apps') {
        warnings.push({
          type: 'compatibility',
          message: `Table "${table}" is macOS-specific, not available on Linux`,
          severity: 'high',
        });
      }
    }
  }

  /**
   * Validate query performance
   */
  private validatePerformance(
    query: string,
    warnings: ValidationWarning[],
    suggestions: string[]
  ): 'fast' | 'medium' | 'slow' {
    const upperQuery = query.toUpperCase();
    let performanceScore = 0;

    // Check for expensive operations
    for (const operation of this.EXPENSIVE_OPERATIONS) {
      if (upperQuery.includes(operation)) {
        performanceScore += 2;
        warnings.push({
          type: 'performance',
          message: `${operation} operations can be slow - consider alternative query structure`,
          severity: 'medium',
        });
      }
    }

    // Check for LIKE with leading wildcard
    if (query.match(/LIKE\s+['"]%/gi)) {
      performanceScore += 1;
      warnings.push({
        type: 'performance',
        message: 'Leading wildcards in LIKE (LIKE "%pattern") prevent index usage',
        severity: 'low',
      });
    }

    // Check for missing LIMIT
    if (!upperQuery.includes('LIMIT')) {
      suggestions.push('Consider adding LIMIT clause to cap result size');
    }

    // Check for missing WHERE
    if (!upperQuery.includes('WHERE') && upperQuery.includes('FROM')) {
      warnings.push({
        type: 'performance',
        message: 'Query has no WHERE clause - will scan entire table',
        severity: 'medium',
      });
      suggestions.push('Add WHERE clause to filter results');
    }

    // Estimate performance
    if (performanceScore >= 3) {
      return 'slow';
    } else if (performanceScore >= 1) {
      return 'medium';
    }

    return 'fast';
  }

  /**
   * Check query against best practices
   */
  private checkBestPractices(
    query: string,
    warnings: ValidationWarning[],
    suggestions: string[]
  ): void {
    // Check for specific column selection
    if (query.includes('SELECT *')) {
      suggestions.push('Specify column names instead of SELECT * for better performance');
    }

    // Check for proper filtering
    if (!query.toUpperCase().includes('WHERE') && query.length > 50) {
      suggestions.push('Add WHERE clause to reduce data scanned');
    }

    // Check for ORDER BY without LIMIT
    if (query.toUpperCase().includes('ORDER BY') && !query.toUpperCase().includes('LIMIT')) {
      warnings.push({
        type: 'performance',
        message: 'ORDER BY without LIMIT may sort large result sets',
        severity: 'medium',
      });
      suggestions.push('Add LIMIT clause when using ORDER BY');
    }

    // Check query length
    if (query.length > 1000) {
      warnings.push({
        type: 'best_practice',
        message: 'Very long query (>1000 chars) - consider simplifying',
        severity: 'low',
      });
    }
  }

  /**
   * Analyze rule compatibility with target version (helper for migration)
   */
  private analyzeRuleCompatibility(
    rule: any,
    targetVersion: string
  ): {
    action: 'none' | 'migrate' | 'deprecate' | 'remove' | 'update';
    reason: string;
    isBreaking: boolean;
  } {
    // Placeholder - would contain version-specific logic
    // For now, assume all rules compatible
    return {
      action: 'none',
      reason: 'Rule is compatible with target version',
      isBreaking: false,
    };
  }

  /**
   * Get recommended query for common compliance checks
   */
  getQueryTemplate(templateName: string): { query: string; description: string } | null {
    const templates: Record<string, { query: string; description: string }> = {
      'password-policy': {
        query: `SELECT * FROM password_policy WHERE require_password_count > 0;`,
        description: 'Check if password policy is configured',
      },
      'no-guest-account': {
        query: `SELECT * FROM users WHERE username = 'guest' OR username = 'Guest';`,
        description: 'Ensure no guest accounts exist',
      },
      'ssh-config': {
        query: `SELECT * FROM file WHERE path = '/etc/ssh/sshd_config' AND directory = '/etc/ssh';`,
        description: 'Check SSH configuration exists',
      },
      'sudo-config': {
        query: `SELECT * FROM sudoers WHERE rule_details LIKE '%NOPASSWD%';`,
        description: 'Check for NOPASSWD sudo rules (insecure)',
      },
      'firewall-enabled': {
        query: `SELECT * FROM iptables WHERE chain = 'INPUT' AND policy != 'DROP';`,
        description: 'Check if firewall has restrictive input policy',
      },
      'listening-ports': {
        query: `SELECT * FROM listening_ports WHERE port IN (21, 23, 25);`,
        description: 'Check for insecure service ports (FTP, Telnet, SMTP)',
      },
    };

    return templates[templateName] || null;
  }

  /**
   * List all available query templates
   */
  listQueryTemplates(): Array<{ name: string; description: string; platform: string[] }> {
    return [
      {
        name: 'password-policy',
        description: 'Check password policy configuration',
        platform: ['darwin', 'linux'],
      },
      {
        name: 'no-guest-account',
        description: 'Ensure no guest accounts exist',
        platform: ['darwin', 'linux', 'windows'],
      },
      {
        name: 'ssh-config',
        description: 'Verify SSH configuration',
        platform: ['linux'],
      },
      {
        name: 'sudo-config',
        description: 'Check sudo configuration',
        platform: ['darwin', 'linux'],
      },
      {
        name: 'firewall-enabled',
        description: 'Check firewall status',
        platform: ['linux'],
      },
      {
        name: 'listening-ports',
        description: 'Find insecure service ports',
        platform: ['darwin', 'linux', 'windows'],
      },
    ];
  }
}
