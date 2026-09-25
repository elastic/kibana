/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnonymizationRule, RegexAnonymizationRule } from './types';
import { DEFAULT_BUILTIN_REGEX_RULES } from './default_builtin_regex_rules';

const isBuiltInRegexRule = (rule: AnonymizationRule): rule is RegexAnonymizationRule =>
  rule.type === 'RegExp' && rule.builtIn === true && typeof rule.id === 'string';

/**
 * Re-derives every built-in rule's `pattern`/`name`/`entityClass`/`type` from
 * {@link DEFAULT_BUILTIN_REGEX_RULES} (the currently shipped code), keyed by `id`, keeping
 * only each rule's persisted `enabled` state.
 *
 * The `ai:anonymizationSettings` uiSetting persists the *entire* rules array — including each
 * built-in rule's `pattern` string — the first time a user saves the settings page. Without
 * this, a later code fix to a built-in pattern (e.g. narrowing an overly-broad host-name
 * regex) would never take effect for any environment that has already saved settings once:
 * the stale pattern frozen into that saved object would keep running forever, and the "fix"
 * would be dead code. This must be applied at every read site that feeds rules into the
 * anonymization pipeline or the settings UI — the inference plugin's server-side
 * `getLegacyRules` and the `ai_anonymization_settings` plugin's `useAnonymizationSettings`
 * hook both call this before using persisted rules.
 *
 * Built-in rules present in `rules` but no longer shipped in code are left untouched (rather
 * than dropped) so removing a built-in doesn't silently invalidate an unrelated saved object.
 * Built-in rules shipped in code but missing from `rules` (e.g. one added in a later release)
 * are appended using their code-defined default `enabled` state, so new built-ins actually
 * reach environments that saved settings before that rule existed. Custom (non-built-in) and
 * NER rules are returned unchanged.
 */
export function refreshBuiltInAnonymizationRules(rules: AnonymizationRule[]): AnonymizationRule[] {
  const currentById = new Map(DEFAULT_BUILTIN_REGEX_RULES.map((rule) => [rule.id, rule]));

  const refreshed = rules.map((rule) => {
    if (!isBuiltInRegexRule(rule)) {
      return rule;
    }
    const current = currentById.get(rule.id);
    return current ? { ...current, enabled: rule.enabled } : rule;
  });

  const knownIds = new Set(refreshed.filter(isBuiltInRegexRule).map((rule) => rule.id));
  const missingBuiltIns = DEFAULT_BUILTIN_REGEX_RULES.filter((rule) => !knownIds.has(rule.id));

  return [...refreshed, ...missingBuiltIns];
}
