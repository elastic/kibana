/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { matchesIndexPattern } from '../../../../common/matches_index_pattern';

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
      return patternsArray.some((pattern: string) => matchesIndexPattern(streamName, pattern));
    })
    .map((templateEntry) => {
      const templatePatterns = templateEntry.index_template.index_patterns || [];
      const patternsArray = Array.isArray(templatePatterns) ? templatePatterns : [templatePatterns];

      // Filter to only include patterns that match
      const matchingPatterns = patternsArray.filter((pattern: string) =>
        matchesIndexPattern(streamName, pattern)
      );

      return {
        name: templateEntry.name,
        priority: templateEntry.index_template.priority ?? 0,
        matchingPatterns,
      };
    })
    .sort((a, b) => b.priority - a.priority); // Sort by priority descending
}
