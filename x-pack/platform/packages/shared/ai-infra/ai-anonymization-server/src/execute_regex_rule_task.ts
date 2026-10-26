/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RE2JS } from 're2js';
import type { RegexAnonymizationRule } from '@kbn/ai-anonymization-common';
import { isShippedBuiltInRule, refineBuiltInMatch } from '@kbn/ai-anonymization-common';
import type { DetectedMatch } from './types';

interface Span {
  start: number;
  end: number;
}

/** Returns every non-empty match of a compiled rule in `value`, in order. */
type FindSpans = (value: string) => Span[];

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
 * Shipped built-in rules run on native `RegExp`: they are written to behave the same on both
 * engines and are bounded, so they cannot backtrack catastrophically. A rule only counts as
 * built-in when it is identical to a shipped one: the `builtIn` flag is stored in the setting, which
 * can be written through the API, and must not select the unprotected engine on its own.
 *
 * Every other rule runs on RE2, which matches in linear time, so a pattern an admin saves (or an
 * attacker's input to it) cannot stall the worker and turn masking off for the request.
 *
 * A rule that RE2 cannot compile (lookahead, lookbehind, backreferences, `\uXXXX`) falls back to
 * native `RegExp`, which is what custom rules always ran on before RE2: a customer's existing rule
 * must not stop masking, or fail every request, because of an engine change. The page only lets
 * new patterns be saved in RE2 syntax, so the fallback is only reachable for rules saved earlier or
 * written through the API. It keeps the protection those rules always had, the worker timeout.
 */
export const compileRulePattern = (rule: RegexAnonymizationRule): FindSpans => {
  const label = rule.name ?? rule.id ?? rule.entityClass;
  const describe = (error: unknown) => (error instanceof Error ? error.message : String(error));
  const invalid = (error: unknown) =>
    new Error(
      `Anonymization rule "${label}" has an invalid regular expression: ${describe(error)}`
    );

  if (isShippedBuiltInRule(rule)) {
    try {
      return findSpansNative(new RegExp(rule.pattern, 'g'));
    } catch (error) {
      throw invalid(error);
    }
  }

  try {
    return findSpansRe2(RE2JS.compile(rule.pattern));
  } catch {
    try {
      return findSpansNative(new RegExp(rule.pattern, 'g'));
    } catch (error) {
      throw invalid(error);
    }
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
    const isShipped = isShippedBuiltInRule(rule);

    return records.flatMap((record: Record<string, string>, recordIndex: number) =>
      Object.entries(record).flatMap(([key, value]) => {
        if (typeof value !== 'string' || value.length === 0) {
          return [];
        }

        return findSpans(value).flatMap((span) => {
          const refined = isShipped
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
