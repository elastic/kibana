/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegexAnonymizationRule } from '@kbn/inference-common';
import type { DetectedMatch } from './types';

/**
 * Executes multiple regex anonymization rules against records to detect all matches.
 * - Processes rules in order, preserving rule precedence via ruleIndex
 * - Returns all matches with their original positions in the unmodified text
 *
 * @param rules - Array of regex anonymization rules to execute
 * @param records - Array of record objects with string field values to search
 * @returns Array of detected matches with position, content, and rule metadata
 */
export const executeRegexRulesTask = ({
  rules,
  records,
}: {
  rules: RegexAnonymizationRule[];
  records: Array<Record<string, string>>;
}): DetectedMatch[] =>
  rules.flatMap((rule, ruleIndex) => {
    const regex = new RegExp(rule.pattern, 'g');

    return records.flatMap((record: Record<string, string>, recordIndex: number) =>
      Object.entries(record).flatMap(([key, value]) => {
        // Reset regex state for each field
        regex.lastIndex = 0;

        const matches: DetectedMatch[] = [];
        let match: RegExpExecArray | null;
        while ((match = regex.exec(value)) !== null) {
          // get position of match in the record
          const start = match.index;
          const matchedText = match[0];
          const end = start + matchedText.length;

          // Guard against zero-length matches that could cause infinite loops
          if (end <= start) {
            regex.lastIndex = start + 1;
            continue;
          }

          matches.push({
            ruleIndex,
            recordIndex,
            recordKey: key,
            start,
            end,
            matchValue: matchedText,
            class_name: rule.entityClass,
          });
        }
        return matches;
      })
    );
  });
