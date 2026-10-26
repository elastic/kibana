/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoostRule, BoostRuleInput } from '../../../common/types';
import type { IndexPatternError, ProfileNameError } from '../../../common/validation';
import {
  MAX_RULE_PRIORITY,
  getIndexPatternError,
  getRuleNameError,
} from '../../../common/validation';

/** How the rule chooses its targets: one name or `*` pattern, or a list of picked names. */
export type RuleTargetMode = 'pattern' | 'pick';

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
  /** Set by the form when a valid pattern matches nothing, which needs the data sources to check. */
  patternMatches?: 'none';
  picked?: 'required';
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
 * Opens an existing rule in the mode that shows its targets: a `*` pattern, or a name that isn't an
 * existing data source, stays in pattern mode, since the picker can only list what exists.
 */
export const ruleToDraft = (
  { name, boost_profile: profileName, index_patterns: patterns, priority }: BoostRule,
  existingNames: ReadonlySet<string>
): RuleDraft => {
  const [firstPattern = ''] = patterns;
  const isPattern =
    patterns.length === 1 && (firstPattern.includes('*') || !existingNames.has(firstPattern));
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

/** Returns only the errors that apply to the draft's target mode. */
export const getRuleDraftErrors = (
  draft: RuleDraft,
  takenNames: readonly string[]
): RuleDraftErrors => ({
  name: getRuleNameError(draft.name, takenNames),
  profile: draft.profileName ? undefined : 'required',
  pattern: draft.mode === 'pattern' ? getIndexPatternError(draft.pattern.trim()) : undefined,
  picked: draft.mode === 'pick' && draft.picked.length === 0 ? 'required' : undefined,
});

export const hasRuleDraftErrors = (errors: RuleDraftErrors): boolean =>
  Object.values(errors).some((error) => error !== undefined);

/** Converts a draft that passed validation into an API payload. */
export const ruleDraftToInput = (draft: RuleDraft): BoostRuleInput => ({
  name: draft.name,
  index_patterns: getDraftPatterns(draft),
  boost_profile: draft.profileName,
  priority: Number(normalizePriority(draft.priority)),
});
