/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Converts an index pattern to a regular expression.
 *
 * Rules:
 * - Escapes all special regex characters except *
 * - Converts * to .* for wildcard matching
 *
 * @param pattern The index pattern (e.g., "logs-*-*", "foo-logs-bar-*")
 * @returns A RegExp that can be used to test if an index name matches the pattern
 *
 * @example
 * ```typescript
 * const regex = indexPatternToRegex('logs-*-*');
 * regex.test('logs-app-default'); // true
 * regex.test('metrics-app-default'); // false
 * ```
 */
export function indexPatternToRegex(pattern: string): RegExp {
  // Escape special regex characters except for *
  const escapedPattern = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  // Replace * with .* for wildcard matching
  const regexPattern = escapedPattern.replace(/\*/g, '.*');
  return new RegExp(`^${regexPattern}$`);
}

/**
 * Checks if an index name matches an index pattern.
 *
 * @param indexName The name of the index to test (e.g., "logs-app-default")
 * @param pattern The index pattern from an index template (e.g., "logs-*-*")
 * @returns true if the index name matches the index pattern, false otherwise
 *
 * @example
 * ```typescript
 * matchesPattern('logs-app-default', 'logs-*-*'); // true
 * matchesPattern('foo-logs-bar-baz', 'foo-logs-bar-*'); // true
 * matchesPattern('metrics-app-default', 'logs-*-*'); // false
 * ```
 */
export function matchesPattern(indexName: string, pattern: string): boolean {
  const regex = indexPatternToRegex(pattern);
  return regex.test(indexName);
}

interface IndexTemplate {
  name: string;
  index_template: {
    priority?: number;
    index_patterns: string | string[];
  };
}

interface ConflictingTemplate {
  /** The name of the conflicting template */
  name: string;
  /** The priority of the conflicting template */
  priority: number;
  /** Only the patterns that actually matched the stream name */
  matchingPatterns: string[];
}

/**
 * Finds index templates that would take precedence over a selected template for a given stream name.
 *
 * This is useful for validating whether a stream name would be created with the expected
 * template, or if a higher priority template would take precedence.
 *
 * @param streamName The name of the stream to check
 * @param selectedTemplateName The name of the template the user expects to use
 * @param selectedTemplatePriority The priority of the selected template
 * @param allTemplates All index templates
 * @returns Array of templates with higher priority that match the stream name, sorted by priority (highest first).
 *          Each template includes only the patterns that actually matched the stream name.
 *
 * @example
 * ```typescript
 * const conflicting = findConflictingTemplates(
 *   'foo-logs-bar-baz',
 *   'lower_priority',
 *   1,
 *   allTemplates
 * );
 * // Returns: [{ name: 'higher_priority', priority: 2, matchingPatterns: ['foo-logs-bar-*'] }]
 * // Note: matchingPatterns only includes patterns that matched 'foo-logs-bar-baz'
 * ```
 */
export function findConflictingTemplates(
  streamName: string,
  selectedTemplateName: string,
  selectedTemplatePriority: number,
  allTemplates: IndexTemplate[]
): ConflictingTemplate[] {
  return allTemplates
    .filter((templateEntry) => {
      // Skip the selected template
      if (templateEntry.name === selectedTemplateName) {
        return false;
      }

      const templatePriority = templateEntry.index_template.priority ?? 0;
      const templatePatterns = templateEntry.index_template.index_patterns || [];

      // Normalize to array
      const patternsArray = Array.isArray(templatePatterns) ? templatePatterns : [templatePatterns];

      // Check if this template has higher priority
      if (templatePriority <= selectedTemplatePriority) {
        return false;
      }

      // Check if at least one pattern matches the stream name
      return patternsArray.some((pattern: string) => matchesPattern(streamName, pattern));
    })
    .map((templateEntry) => {
      const templatePatterns = templateEntry.index_template.index_patterns || [];
      const patternsArray = Array.isArray(templatePatterns) ? templatePatterns : [templatePatterns];

      // Filter to only include patterns that match
      const matchingPatterns = patternsArray.filter((pattern: string) =>
        matchesPattern(streamName, pattern)
      );

      return {
        name: templateEntry.name,
        priority: templateEntry.index_template.priority ?? 0,
        matchingPatterns,
      };
    })
    .sort((a, b) => b.priority - a.priority); // Sort by priority descending
}
