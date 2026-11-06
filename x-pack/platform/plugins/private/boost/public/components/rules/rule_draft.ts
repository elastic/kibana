/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoostRule, BoostRuleInput, RuleTargetMode } from '../../../common/types';
import type { IndexPatternError, ProfileNameError } from '../../../common/validation';
import {
  MAX_RULE_PRIORITY,
  getIndexPatternError,
  getRuleNameError,
} from '../../../common/validation';

// Form fields hold strings so inputs can be empty or mid-edit; they're parsed on validation.
export interface RuleDraft {
  name: string;
  profileName: string;
  mode: RuleTargetMode;
  pattern: string;
  picked: string[];
  priority: string;
}

export interface RuleDraftErrors {
  name?: ProfileNameError;
  profile?: 'required';
  pattern?: IndexPatternError;
  picked?: 'required' | 'too_many';
  /** Set by the form to the name of a rule the draft would tie with, which Elasticsearch rejects. */
  conflictsWith?: string;
}

/** A new rule starts in pattern mode at priority 0, which Elasticsearch also defaults to. */
export const createEmptyRuleDraft = (profileName = ''): RuleDraft => ({
  name: '',
  profileName,
  mode: 'pattern',
  pattern: '',
  picked: [],
  priority: '0',
});

/**
 * The mode a rule's targets were chosen in, which the rule keeps in its `_meta`. A rule without it,
 * such as a default rule or one created through the API, is a pattern when it's a `*` pattern or a
 * name that isn't an existing data source, since the picker can only list what exists.
 */
export const getRuleTargetMode = (
  { index_patterns: patterns, _meta: meta }: BoostRule,
  existingNames: ReadonlySet<string>
): RuleTargetMode => {
  if (meta?.target_mode) {
    return meta.target_mode;
  }
  const [firstPattern = ''] = patterns;
  return patterns.length === 1 && (firstPattern.includes('*') || !existingNames.has(firstPattern))
    ? 'pattern'
    : 'pick';
};

/** The names a rule picked that no index or data stream has, such as one deleted since. */
export const getMissingTargets = (rule: BoostRule, existingNames: ReadonlySet<string>): string[] =>
  getRuleTargetMode(rule, existingNames) === 'pick'
    ? rule.index_patterns.filter((name) => !existingNames.has(name))
    : [];

/** Opens an existing rule in the mode its targets were chosen in. */
export const ruleToDraft = (rule: BoostRule, existingNames: ReadonlySet<string>): RuleDraft => {
  const { name, boost_profile: profileName, index_patterns: patterns, priority } = rule;
  const isPattern = getRuleTargetMode(rule, existingNames) === 'pattern';
  const [firstPattern = ''] = patterns;
  return {
    name,
    profileName,
    mode: isPattern ? 'pattern' : 'pick',
    pattern: isPattern ? firstPattern : '',
    picked: isPattern ? [] : patterns,
    priority: String(priority),
  };
};

const parseNumber = (value: string): number | undefined => {
  const parsed = Number(value);
  return value.trim() === '' || Number.isNaN(parsed) ? undefined : parsed;
};

/**
 * A priority the rule can use, so the field never needs an error: anything that isn't a number of
 * 0 or more becomes 0, a fraction is dropped, and the largest Elasticsearch accepts is the limit.
 */
export const normalizePriority = (value: string): string => {
  const parsed = parseNumber(value);
  if (parsed === undefined || parsed < 0) {
    return '0';
  }
  return String(Math.min(Math.floor(parsed), MAX_RULE_PRIORITY));
};

/** The draft's targets in the shape a rule stores them. */
export const getDraftPatterns = ({ mode, pattern, picked }: RuleDraft): string[] =>
  mode === 'pattern' ? [pattern.trim()] : picked;

const getPickedError = (
  { mode, picked }: RuleDraft,
  allowsMultipleTargets: boolean
): RuleDraftErrors['picked'] => {
  if (mode !== 'pick') {
    return undefined;
  }
  if (picked.length === 0) {
    return 'required';
  }
  return picked.length > 1 && !allowsMultipleTargets ? 'too_many' : undefined;
};

/**
 * Returns only the errors that apply to the draft's target mode. Elasticsearch takes one target per
 * rule, so a draft can only select several when the prototype allows it.
 */
export const getRuleDraftErrors = (
  draft: RuleDraft,
  takenNames: readonly string[],
  allowsMultipleTargets = false
): RuleDraftErrors => ({
  name: getRuleNameError(draft.name, takenNames),
  profile: draft.profileName ? undefined : 'required',
  pattern: draft.mode === 'pattern' ? getIndexPatternError(draft.pattern.trim()) : undefined,
  picked: getPickedError(draft, allowsMultipleTargets),
});

export const hasRuleDraftErrors = (errors: RuleDraftErrors): boolean =>
  Object.values(errors).some((error) => error !== undefined);

/** Converts a draft that passed validation into an API payload. */
export const ruleDraftToInput = (draft: RuleDraft): BoostRuleInput => ({
  name: draft.name,
  index_patterns: getDraftPatterns(draft),
  boost_profile: draft.profileName,
  priority: Number(normalizePriority(draft.priority)),
  _meta: { target_mode: draft.mode },
});
