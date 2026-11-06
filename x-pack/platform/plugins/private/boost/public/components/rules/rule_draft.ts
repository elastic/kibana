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

// Form fields hold strings so inputs can be empty or mid-edit; they're parsed on validation.
export interface RuleDraft {
  name: string;
  profileName: string;
  /** A name, or a pattern using `*`. */
  pattern: string;
  priority: string;
}

export interface RuleDraftErrors {
  name?: ProfileNameError;
  profile?: 'required';
  pattern?: IndexPatternError;
  /** Set by the form to the name of a rule the draft would tie with, which Elasticsearch rejects. */
  conflictsWith?: string;
}

/** A new rule starts without targets at priority 0, which Elasticsearch also defaults to. */
export const createEmptyRuleDraft = (profileName = ''): RuleDraft => ({
  name: '',
  profileName,
  pattern: '',
  priority: '0',
});

/**
 * Opens an existing rule. One saved with several targets, which the prototype once allowed, lists
 * them with commas, which the field asks to narrow to one.
 */
export const ruleToDraft = ({
  name,
  boost_profile: profileName,
  index_patterns: patterns,
  priority,
}: BoostRule): RuleDraft => ({
  name,
  profileName,
  pattern: patterns.join(', '),
  priority: String(priority),
});

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

/** The draft's target in the shape a rule stores it. */
export const getDraftPatterns = ({ pattern }: RuleDraft): string[] => [pattern.trim()];

/** Validates the draft. Elasticsearch takes one name or pattern per rule. */
export const getRuleDraftErrors = (
  draft: RuleDraft,
  takenNames: readonly string[]
): RuleDraftErrors => ({
  name: getRuleNameError(draft.name, takenNames),
  profile: draft.profileName ? undefined : 'required',
  pattern: getIndexPatternError(draft.pattern.trim()),
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
