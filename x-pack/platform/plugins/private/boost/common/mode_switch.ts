/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDefaultRules, getEffectiveDefaults, translateSimpleDefaults } from './presets';
import { PROFILE_TYPE_BY_DATA_SOURCE, resolveRule } from './resolution';
import type { BoostMode, BoostProfileType, BoostRule, BoostState } from './types';

/** An index or data stream whose boost profile changes when the mode switches. */
export interface ModeSwitchChange {
  name: string;
  type: BoostProfileType;
  from: string;
  to: string;
}

/**
 * A rule behind some of a mode switch's changes: a custom rule that the switch suspends or
 * restores, or a default rule whose profile changes.
 */
export interface ModeSwitchRuleChanges {
  rule: BoostRule;
  changes: ModeSwitchChange[];
}

/**
 * The rules each mode applies. Simple mode suspends custom rules, and its default rules follow the
 * simple-mode settings; advanced mode restores both custom rules and custom default profiles.
 */
const getModeRules = (
  { settings, rules, suspended_rules: suspendedRules }: BoostState,
  mode: BoostMode
): BoostRule[] => {
  if (mode === 'simple') {
    return createDefaultRules(translateSimpleDefaults(settings.simple));
  }
  const customRules =
    settings.mode === 'advanced'
      ? rules.filter(({ is_builtin: isBuiltin }) => !isBuiltin)
      : suspendedRules;
  return [...customRules, ...createDefaultRules(getEffectiveDefaults({ ...settings, mode }))];
};

/**
 * What switching to a mode changes: each index or data stream that would use a different boost
 * profile, grouped by the rule behind the change. Custom rules come first, by name.
 */
export const getModeSwitchChanges = (
  state: BoostState,
  mode: BoostMode
): ModeSwitchRuleChanges[] => {
  const profilesByName = new Map(state.profiles.map((profile) => [profile.name, profile]));
  const currentRules = getModeRules(state, state.settings.mode);
  const nextRules = getModeRules(state, mode);
  const changesByRule = new Map<string, ModeSwitchRuleChanges>();

  [...state.data_sources]
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((dataSource) => {
      const currentRule = resolveRule(dataSource, currentRules, profilesByName);
      const nextRule = resolveRule(dataSource, nextRules, profilesByName);
      if (!currentRule || !nextRule || currentRule.boost_profile === nextRule.boost_profile) {
        return;
      }
      // A custom rule on either side is the one suspended or restored; otherwise the default
      // rule's profile changed.
      const rule = currentRule.is_builtin ? nextRule : currentRule;
      const ruleChanges = changesByRule.get(rule.name) ?? { rule, changes: [] };
      ruleChanges.changes.push({
        name: dataSource.name,
        type: PROFILE_TYPE_BY_DATA_SOURCE[dataSource.type],
        from: currentRule.boost_profile,
        to: nextRule.boost_profile,
      });
      changesByRule.set(rule.name, ruleChanges);
    });

  return [...changesByRule.values()].sort(
    (a, b) =>
      Number(a.rule.is_builtin) - Number(b.rule.is_builtin) ||
      a.rule.name.localeCompare(b.rule.name)
  );
};
