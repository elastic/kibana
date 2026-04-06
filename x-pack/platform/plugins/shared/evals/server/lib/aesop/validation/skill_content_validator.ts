/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Skill Content Validator
 *
 * Validates proposed skill content for common issues before storing.
 * Skills that reference backing indices or internal index names directly
 * are rejected because those names are unstable — they change on rollover
 * and should never appear in user-facing queries or documentation.
 *
 * Correct: `.alerts-security.alerts-default` (alias / data stream name)
 * Wrong:   `.internal.alerts-security.alerts-default-000001` (backing index)
 * Wrong:   `.ds-logs-endpoint.events.process-default-2024.01.01-000001` (backing index)
 */

export interface SkillValidationIssue {
  rule: string;
  severity: 'error' | 'warning';
  message: string;
  match: string;
}

export interface SkillValidationResult {
  valid: boolean;
  issues: SkillValidationIssue[];
}

/**
 * Matches backing index patterns that should never appear in skill content:
 *
 * 1. `.ds-*-NNNNNN` — Data stream backing indices (e.g. `.ds-logs-endpoint.events.process-default-2024.01.01-000001`)
 * 2. `.internal.*-NNNNNN` — Internal alert backing indices (e.g. `.internal.alerts-security.alerts-default-000001`)
 * 3. Any index name ending with `-NNNNNN` where NNNNNN is a 6-digit rollover suffix
 *
 * These are internal Elasticsearch implementation details that roll over
 * and should be replaced with the data stream or alias name.
 */
const BACKING_INDEX_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  {
    pattern: /\.ds-[a-z0-9.*_-]+-\d{6}\b/gi,
    description: 'Data stream backing index (.ds-*-NNNNNN)',
  },
  {
    pattern: /\.internal\.[a-z0-9.*_-]+-\d{6}\b/gi,
    description: 'Internal backing index (.internal.*-NNNNNN)',
  },
  {
    pattern: /(?<![a-z])(?:logs|metrics|traces|\.alerts|\.siem)-[a-z0-9.*_-]+-\d{6}\b/gi,
    description: 'Rollover index with numeric suffix (*-NNNNNN)',
  },
];

/**
 * Validate skill content (markdown + queries) for direct backing index references.
 *
 * Skills must reference data streams or aliases — never backing indices.
 * Backing indices are internal, can roll over at any time, and make
 * skills brittle and non-portable.
 */
export function validateSkillContent(content: string): SkillValidationResult {
  const issues: SkillValidationIssue[] = [];

  for (const { pattern, description } of BACKING_INDEX_PATTERNS) {
    // Reset lastIndex for global regex
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      issues.push({
        rule: 'no_backing_index_reference',
        severity: 'error',
        message: `Skill references a backing index directly: "${match[0]}". Use the data stream or alias name instead. ${description} names are internal to Elasticsearch and change on rollover.`,
        match: match[0],
      });
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Suggest the correct data stream / alias name for a backing index.
 *
 * Examples:
 *   .internal.alerts-security.alerts-default-000001 → .alerts-security.alerts-default
 *   .ds-logs-endpoint.events.process-default-2024.01.01-000001 → logs-endpoint.events.process-default
 */
export function suggestCorrectIndexName(backingIndex: string): string | null {
  // .internal.alerts-security.alerts-default-000001 → .alerts-security.alerts-default
  const internalMatch = backingIndex.match(/^\.internal\.(.+)-\d{6}$/);
  if (internalMatch) {
    return `.${internalMatch[1]}`;
  }

  // .ds-logs-endpoint.events.process-default-2024.01.01-000001 → logs-endpoint.events.process-default
  const dsMatch = backingIndex.match(/^\.ds-(.+?)(?:-\d{4}\.\d{2}\.\d{2})?-\d{6}$/);
  if (dsMatch) {
    return dsMatch[1];
  }

  // Generic rollover suffix: something-000001 → something
  const rolloverMatch = backingIndex.match(/^(.+)-\d{6}$/);
  if (rolloverMatch) {
    return rolloverMatch[1];
  }

  return null;
}
