/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegexAnonymizationRule } from '@kbn/inference-common';
import type { AnonymizationState, DetectedMatch } from './types';
import { getEntityMask } from './get_entity_mask';

/**
 * Processes detected matches by resolving overlaps and applying masks to records.
 * Returns updated state with masked records and anonymizations.
 */
export function resolveOverlapsAndMask({
  detectedMatches,
  state,
  rules,
}: {
  detectedMatches: DetectedMatch[];
  state: AnonymizationState;
  rules: RegexAnonymizationRule[];
}): AnonymizationState {
  if (detectedMatches.length === 0) {
    return state;
  }

  // Group matches by record and field
  const matchesByRecordAndField = detectedMatches.reduce((acc, match) => {
    if (!acc.has(match.recordIndex)) {
      acc.set(match.recordIndex, new Map<string, DetectedMatch[]>());
    }
    const recordMatches = acc.get(match.recordIndex)!;
    if (!recordMatches.has(match.recordKey)) {
      recordMatches.set(match.recordKey, []);
    }
    recordMatches.get(match.recordKey)!.push(match);
    return acc;
  }, new Map<number, Map<string, DetectedMatch[]>>());

  // Process each record and field
  matchesByRecordAndField.forEach((fieldMatches, recordIndex) => {
    fieldMatches.forEach((matches, fieldName) => {
      const originalText = state.records[recordIndex][fieldName];

      // Resolve overlaps (first rule wins)
      const nonOverlappingMatches: DetectedMatch[] = [];
      let lastEnd = -1;

      for (const match of matches) {
        // Skip if this match overlaps with a higher priority match
        if (match.start < lastEnd) {
          continue;
        }

        nonOverlappingMatches.push(match);
        lastEnd = match.end;
      }

      // Apply masks in a single pass
      if (nonOverlappingMatches.length > 0) {
        let result = '';
        let lastIndex = 0;

        for (const match of nonOverlappingMatches) {
          // Add text before the match
          result += originalText.substring(lastIndex, match.start);

          // Create and add the mask
          const mask = getEntityMask({
            value: match.matchValue,
            class_name: match.class_name,
          });
          result += mask;

          // Add to anonymizations
          state.anonymizations.push({
            rule: {
              type: rules[match.ruleIndex].type,
            },
            entity: {
              value: match.matchValue,
              class_name: match.class_name,
              mask,
            },
          });

          lastIndex = match.end;
        }

        // Add remaining text after the last match
        result += originalText.substring(lastIndex);

        // Update the record with masked text
        state.records[recordIndex][fieldName] = result;
      }
    });
  });

  return state;
}
