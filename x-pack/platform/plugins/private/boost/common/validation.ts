/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_BOOST, MIN_BOOST } from './constants';

// Rules mirror the Elasticsearch `_boost` API. The form and the server both use these checks, and
// each maps the returned codes to its own messages.

export const PROFILE_NAME_MAX_LENGTH = 255;
export const MAX_AGE_MAX_DAYS = 3650;
export const INDEX_PATTERN_MAX_LENGTH = 255;
// Bounds request size; picked lists are otherwise unlimited.
export const MAX_RULE_INDEX_PATTERNS = 1000;
// Elasticsearch stores rule priorities as 32-bit integers.
export const MAX_RULE_PRIORITY = 2_147_483_647;

export type ProfileNameError = 'required' | 'too_long' | 'invalid_characters' | 'already_exists';

export type BoostRangeError =
  | 'min_required'
  | 'max_required'
  | 'min_out_of_range'
  | 'max_out_of_range'
  | 'max_not_positive'
  | 'max_below_min';

export type MaxAgeError = 'required' | 'out_of_range' | 'below_previous_period';

export type IndexPatternError = 'required' | 'too_long' | 'invalid_characters';

export type IndexPatternsError = 'required' | 'too_many' | 'wildcard_in_list';

export type RulePriorityError = 'required' | 'out_of_range';

/** Units a period's max age can use, matching the Elasticsearch time unit suffixes. */
export type MaxAgeUnit = 'd' | 'h';

export interface MaxAge {
  value: number;
  unit: MaxAgeUnit;
}

const HOURS_PER_UNIT: Readonly<Record<MaxAgeUnit, number>> = { d: 24, h: 1 };
const MAX_AGE_MAX_HOURS = MAX_AGE_MAX_DAYS * HOURS_PER_UNIT.d;

// Lowercase letters, numbers, hyphens and underscores; must not start with a hyphen or underscore.
const PROFILE_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

export const getProfileNameError = (
  name: string,
  existingNames: readonly string[] = []
): ProfileNameError | undefined => {
  if (name.length === 0) {
    return 'required';
  }
  if (name.length > PROFILE_NAME_MAX_LENGTH) {
    return 'too_long';
  }
  if (!PROFILE_NAME_PATTERN.test(name)) {
    return 'invalid_characters';
  }
  return existingNames.includes(name) ? 'already_exists' : undefined;
};

/**
 * Rule names follow the same rules as profile names. Elasticsearch also allows uppercase letters in
 * rule names, but one naming scheme for both is simpler to explain.
 */
export const getRuleNameError = getProfileNameError;

/** Validates a rule's index pattern: a single data source name or `*` pattern. */
export const getIndexPatternError = (pattern: string): IndexPatternError | undefined => {
  if (pattern.length === 0) {
    return 'required';
  }
  if (pattern.length > INDEX_PATTERN_MAX_LENGTH) {
    return 'too_long';
  }
  // A rule holds one pattern, so Elasticsearch rejects comma-separated lists.
  return /[,\s]/.test(pattern) ? 'invalid_characters' : undefined;
};

/** Validates a rule's targets: one pattern, or a list of names without `*` patterns. */
export const getIndexPatternsError = (
  patterns: readonly string[]
): IndexPatternsError | undefined => {
  if (patterns.length === 0) {
    return 'required';
  }
  if (patterns.length > MAX_RULE_INDEX_PATTERNS) {
    return 'too_many';
  }
  return patterns.length > 1 && patterns.some((pattern) => pattern.includes('*'))
    ? 'wildcard_in_list'
    : undefined;
};

/** Validates a rule priority: a whole number of 0 or more. */
export const getRulePriorityError = (
  priority: number | undefined
): RulePriorityError | undefined => {
  if (priority === undefined) {
    return 'required';
  }
  return Number.isInteger(priority) && priority >= 0 && priority <= MAX_RULE_PRIORITY
    ? undefined
    : 'out_of_range';
};

const isInBoostRange = (value: number) => value >= MIN_BOOST && value <= MAX_BOOST;

export const getBoostRangeError = (
  minBoost: number | undefined,
  maxBoost: number | undefined
): BoostRangeError | undefined => {
  if (minBoost === undefined) {
    return 'min_required';
  }
  if (maxBoost === undefined) {
    return 'max_required';
  }
  if (!isInBoostRange(minBoost)) {
    return 'min_out_of_range';
  }
  if (!isInBoostRange(maxBoost)) {
    return 'max_out_of_range';
  }
  if (maxBoost <= 0) {
    return 'max_not_positive';
  }
  return maxBoost < minBoost ? 'max_below_min' : undefined;
};

/** Converts a max age to hours, so ages in different units can be compared. */
export const toMaxAgeHours = ({ value, unit }: MaxAge): number => value * HOURS_PER_UNIT[unit];

/**
 * Validates a period's max age: a whole number of days or hours, up to the maximum, that isn't
 * shorter than the period before it.
 */
export const getMaxAgeError = (
  maxAge: MaxAge | undefined,
  previousPeriod?: MaxAge
): MaxAgeError | undefined => {
  if (maxAge === undefined) {
    return 'required';
  }
  if (
    !Number.isInteger(maxAge.value) ||
    maxAge.value < 1 ||
    toMaxAgeHours(maxAge) > MAX_AGE_MAX_HOURS
  ) {
    return 'out_of_range';
  }
  return previousPeriod !== undefined && toMaxAgeHours(maxAge) < toMaxAgeHours(previousPeriod)
    ? 'below_previous_period'
    : undefined;
};

/** Parses a max age such as `7d` or `12h`, or returns `undefined` for other formats. */
export const parseMaxAge = (maxAge: string | undefined): MaxAge | undefined => {
  const match = maxAge?.match(/^(\d+)([dh])$/);
  if (!match) {
    return undefined;
  }
  const [, value, unit] = match;
  return { value: Number(value), unit: unit === 'h' ? 'h' : 'd' };
};

export const formatMaxAge = ({ value, unit }: MaxAge): string => `${value}${unit}`;

/** Whether an indices profile pins its cached data without prewarming it, which isn't allowed. */
export const isPinnedWithoutPrewarm = ({
  prewarm,
  pinned,
}: {
  prewarm: boolean;
  pinned: boolean;
}): boolean => pinned && !prewarm;
