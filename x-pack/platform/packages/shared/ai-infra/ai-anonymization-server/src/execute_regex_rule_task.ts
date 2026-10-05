/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegexAnonymizationRule } from '@kbn/ai-anonymization-common';
import type { DetectedMatch } from './types';

/**
 * Compiles a rule's pattern. A pattern that does not compile throws instead of being skipped,
 * so the pipeline's `onFailure` mode decides what happens: silently dropping the rule would
 * leave data the admin believes is masked going to the model.
 */
const compileRulePattern = (rule: RegexAnonymizationRule): RegExp => {
  try {
    return new RegExp(rule.pattern, 'g');
  } catch (error) {
    const label = rule.name ?? rule.id ?? rule.entityClass;
    throw new Error(
      `Anonymization rule "${label}" has an invalid regular expression: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

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
    const regex = compileRulePattern(rule);

    return records.flatMap((record: Record<string, string>, recordIndex: number) =>
      Object.entries(record).flatMap(([key, value]) => {
        if (typeof value !== 'string' || value.length === 0) {
          return [];
        }

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
