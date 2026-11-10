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

const re2CompileCache = new Map<string, boolean>();
const RE2_CACHE_LIMIT = 500;

const compilesOnRe2 = (pattern: string): boolean => {
  const cached = re2CompileCache.get(pattern);
  if (cached !== undefined) {
    return cached;
  }
  let compiles = true;
  try {
    RE2JS.compile(pattern);
  } catch {
    compiles = false;
  }
  if (re2CompileCache.size >= RE2_CACHE_LIMIT) {
    re2CompileCache.clear();
  }
  re2CompileCache.set(pattern, compiles);
  return compiles;
};

type RuleEngine = 'shipped-native' | 're2' | 'legacy-native';

/**
 * The single place that decides which engine runs a rule, so that compiling a rule and deciding
 * where to run it cannot drift apart.
 *
 * - Shipped built-in rules run on native `RegExp`: they are written to behave the same on both
 *   engines and are bounded, so they cannot backtrack catastrophically. A rule only counts as
 *   built-in when it is identical to a shipped one: the `builtIn` flag is stored in the setting,
 *   which can be written through the API, and must not select the unprotected engine on its own.
 * - Every other rule runs on RE2, which matches in linear time, so a pattern an admin saves (or an
 *   attacker's input to it) cannot stall the worker and turn masking off for the request.
 * - A rule that RE2 cannot compile (lookahead, lookbehind, backreferences, `\uXXXX`) falls back to
 *   native `RegExp`, which is what custom rules always ran on before RE2: a customer's existing
 *   rule must not stop masking, or fail every request, because of an engine change. The page only
 *   lets new patterns be saved in RE2 syntax, so the fallback is only reachable for rules saved
 *   earlier or written through the API.
 */
const chooseEngine = (rule: RegexAnonymizationRule): RuleEngine => {
  if (isShippedBuiltInRule(rule)) {
    return 'shipped-native';
  }
  return compilesOnRe2(rule.pattern) ? 're2' : 'legacy-native';
};

/**
 * Whether the rule runs on the native `RegExp` fallback. Such a rule has no linear-time guarantee,
 * so callers run it in a worker task of its own: when it stalls and the task is aborted, only its
 * matches are lost, not those of the built-in and RE2 rules that would otherwise share the task.
 */
export const usesNativeFallback = (rule: RegexAnonymizationRule): boolean =>
  chooseEngine(rule) === 'legacy-native';

/**
 * Compiles a rule's pattern. A pattern that does not compile throws instead of being skipped,
 * so the pipeline's `onFailure` mode decides what happens: silently dropping the rule would
 * leave data the admin believes is masked going to the model.
 */
export const compileRulePattern = (rule: RegexAnonymizationRule): FindSpans => {
  const label = rule.name ?? rule.id ?? rule.entityClass;
  try {
    return chooseEngine(rule) === 're2'
      ? findSpansRe2(RE2JS.compile(rule.pattern))
      : findSpansNative(new RegExp(rule.pattern, 'g'));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Anonymization rule "${label}" has an invalid regular expression: ${reason}`);
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
