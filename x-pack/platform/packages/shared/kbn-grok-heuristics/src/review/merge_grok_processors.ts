/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import type { GrokProcessorResult } from './get_grok_processor';

/**
 * Merges multiple GrokProcessorResult objects into a single result.
 * - Combines patterns and ensures unique pattern definitions by renaming duplicates.
 * - Merges descriptions from all processors into a single string.
 *
 * @param grokProcessors - Array of GrokProcessorResult objects to merge.
 * @returns A single GrokProcessorResult with merged patterns, definitions, and descriptions.
 */
export function mergeGrokProcessors(grokProcessors: GrokProcessorResult[]): GrokProcessorResult {
  if (grokProcessors.length === 1) {
    return grokProcessors[0];
  }

  const mergedPatterns: string[] = [];
  const mergedPatternDefinitions: Record<string, string> = {};
  const patternDefinitionCounters: Record<string, number> = {};

  grokProcessors.forEach((processor) => {
    const updatedPatterns = processor.patterns.map((pattern) => {
      let updatedPattern = pattern;

      if (processor.pattern_definitions) {
        Object.entries(processor.pattern_definitions).forEach(([key, value]) => {
          if (!mergedPatternDefinitions[key]) {
            // Add the pattern definition if it doesn't exist
            mergedPatternDefinitions[key] = value;
            patternDefinitionCounters[key] = 1; // Initialize counter for this pattern definition
          } else {
            // Rename the pattern definition if it already exists
            const newKey = `${key}${++patternDefinitionCounters[key]}`;
            mergedPatternDefinitions[newKey] = value;

            // Update the pattern to use the renamed pattern definition
            const regex = new RegExp(`%{${key}:`, 'g');
            updatedPattern = updatedPattern.replace(regex, `%{${newKey}:`);
          }
        });
      }

      return updatedPattern;
    });

    // Append the updated patterns to the merged patterns array
    mergedPatterns.push(...updatedPatterns);
  });

  const descriptions = uniq(grokProcessors.map((processor) => processor.description));

  // Deduplicate patterns - if multiple identical patterns exist, keep only one
  const uniquePatterns = uniq(mergedPatterns);

  return {
    description: descriptions.join(', '),
    patterns: uniquePatterns,
    pattern_definitions: mergedPatternDefinitions,
  };
}
