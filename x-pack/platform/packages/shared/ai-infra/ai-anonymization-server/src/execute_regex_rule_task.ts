/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RE2JS } from 're2js';
import type { RegexAnonymizationRule } from '@kbn/ai-anonymization-common';
import { refineBuiltInMatch } from '@kbn/ai-anonymization-common';
import type { DetectedMatch } from './types';

interface Span {
  start: number;
  end: number;
}

/** Returns every non-empty match of a compiled rule in `value`, in order. */
type FindSpans = (value: string) => Span[];

const RE2_HINT =
  'Custom patterns use RE2 syntax: lookahead, lookbehind, backreferences and \\uXXXX escapes ' +
  'are not supported (write a character code as \\x{00e9}).';

const findSpansNative =
  (regex: RegExp): FindSpans =>
  (value) => {
    const spans: Span[] = [];
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(value)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      // Guard against zero-length matches that could cause infinite loops
      if (end <= start) {
        regex.lastIndex = start + 1;
        continue;
      }
      spans.push({ start, end });
    }
    return spans;
  };

const findSpansRe2 =
  (pattern: RE2JS): FindSpans =>
  (value) => {
    const spans: Span[] = [];
    const matcher = pattern.matcher(value);
    let from: number | undefined;
    while (from === undefined ? matcher.find() : matcher.find(from)) {
      const start = matcher.start();
      const end = matcher.end();
      from = undefined;
      if (end <= start) {
        if (start + 1 > value.length) break;
        from = start + 1;
        continue;
      }
      spans.push({ start, end });
    }
    return spans;
  };

/**
 * Compiles a rule's pattern. A pattern that does not compile throws instead of being skipped,
 * so the pipeline's `onFailure` mode decides what happens: silently dropping the rule would
 * leave data the admin believes is masked going to the model.
 *
 * Built-in rules run on native `RegExp`: they are written to behave the same on both engines and
 * are bounded, so they cannot backtrack catastrophically. Custom rules run on RE2, which matches
 * in linear time, so a pattern an admin saves (or an attacker's input to it) cannot stall the
 * worker and turn masking off for the request.
 */
export const compileRulePattern = (rule: RegexAnonymizationRule): FindSpans => {
  try {
    return rule.builtIn
      ? findSpansNative(new RegExp(rule.pattern, 'g'))
      : findSpansRe2(RE2JS.compile(rule.pattern));
  } catch (error) {
    const label = rule.name ?? rule.id ?? rule.entityClass;
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Anonymization rule "${label}" has an invalid regular expression: ${reason}${
        rule.builtIn ? '' : `. ${RE2_HINT}`
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
    const findSpans = compileRulePattern(rule);

    return records.flatMap((record: Record<string, string>, recordIndex: number) =>
      Object.entries(record).flatMap(([key, value]) => {
        if (typeof value !== 'string' || value.length === 0) {
          return [];
        }

        return findSpans(value).flatMap((span) => {
          const refined = rule.builtIn
            ? refineBuiltInMatch(rule.id, value, span.start, span.end)
            : span;
          return refined
            ? [
                {
                  ruleIndex,
                  recordIndex,
                  recordKey: key,
                  start: refined.start,
                  end: refined.end,
                  matchValue: value.slice(refined.start, refined.end),
                  class_name: rule.entityClass,
                },
              ]
            : [];
        });
      })
    );
  });
