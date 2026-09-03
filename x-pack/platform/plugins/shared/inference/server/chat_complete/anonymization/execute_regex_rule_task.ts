/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RE2JS } from 're2js';
import type { RegexAnonymizationRule } from '@kbn/inference-common';
import type { DetectedMatch } from './types';

/**
 * Executes multiple regex anonymization rules against records to detect all matches.
 * - Processes rules in order, preserving rule precedence via ruleIndex
 * - Returns all matches with their original positions in the unmodified text
 * - Uses RE2JS for linear-time matching, which eliminates ReDoS by design
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
    let pattern: RE2JS;
    try {
      pattern = RE2JS.compile(rule.pattern);
    } catch {
      return [];
    }

    return records.flatMap((record: Record<string, string>, recordIndex: number) =>
      Object.entries(record).flatMap(([key, value]) => {
        if (typeof value !== 'string' || value.length === 0) {
          return [];
        }

        const matcher = pattern.matcher(value);
        const matches: DetectedMatch[] = [];

        while (matcher.find()) {
          const start = matcher.start();
          const end = matcher.end();

          if (end <= start) {
            break;
          }

          matches.push({
            ruleIndex,
            recordIndex,
            recordKey: key,
            start,
            end,
            // group() returns null only when find() has not been called yet; safe to assert here
            matchValue: matcher.group()!,
            class_name: rule.entityClass,
          });
        }
        return matches;
      })
    );
  });
