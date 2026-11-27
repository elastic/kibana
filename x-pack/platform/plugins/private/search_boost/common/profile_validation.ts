/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { splitTimeValue } from './time_value';
import type { ValidationError } from './validation';

/** Operator limits on the boost range of custom profiles, which Elasticsearch enforces on save. */
export interface BoostLimits {
  minBoost: number;
  maxBoost: number;
  maxRatio?: number;
}

export const MAX_AGE_MAX_DAYS = 3650;

/** The units a max age can be in, in the order the unit menu offers them. */
export const MAX_AGE_UNITS = ['h', 'd'] as const;

export type MaxAgeUnit = (typeof MAX_AGE_UNITS)[number];

/** The max age of a data streams period, in the units Elasticsearch accepts for it. */
export interface MaxAge {
  value: number;
  unit: MaxAgeUnit;
}

export type BoostErrorCode = 'required' | 'outOfRange' | 'notPositive' | 'belowMin' | 'aboveRatio';
export type BoostError = ValidationError<BoostErrorCode>;

export type MaxAgeErrorCode = 'required' | 'outOfRange' | 'belowRecent';
export type MaxAgeError = ValidationError<MaxAgeErrorCode>;

const HOURS_PER_UNIT: Readonly<Record<MaxAgeUnit, number>> = { h: 1, d: 24 };

export const MAX_AGE_MAX_VALUES: Readonly<Record<MaxAgeUnit, number>> = {
  h: MAX_AGE_MAX_DAYS * HOURS_PER_UNIT.d,
  d: MAX_AGE_MAX_DAYS,
};

const MIN_BOOST_REQUIRED = i18n.translate('xpack.searchBoost.validation.minBoostRequired', {
  defaultMessage: 'Enter a minimum boost.',
});

const MAX_BOOST_REQUIRED = i18n.translate('xpack.searchBoost.validation.maxBoostRequired', {
  defaultMessage: 'Enter a maximum boost.',
});

const MAX_BOOST_NOT_POSITIVE = i18n.translate('xpack.searchBoost.validation.maxBoostNotPositive', {
  defaultMessage: 'Maximum boost must be greater than 0.',
});

const MAX_BOOST_BELOW_MIN = i18n.translate('xpack.searchBoost.validation.maxBoostBelowMin', {
  defaultMessage: 'Maximum boost must be at least the minimum boost.',
});

const getBoostOutOfRangeMessage = ({ minBoost, maxBoost }: BoostLimits): string =>
  i18n.translate('xpack.searchBoost.validation.boostOutOfRange', {
    defaultMessage: 'Enter a value from {min, number} to {max, number}.',
    values: { min: minBoost, max: maxBoost },
  });

const getMaxBoostAboveRatioMessage = (maxRatio: number): string =>
  i18n.translate('xpack.searchBoost.validation.maxBoostAboveRatio', {
    defaultMessage: 'Maximum boost must be at most {maxRatio, number} times the minimum boost.',
    values: { maxRatio },
  });

const MAX_AGE_MESSAGES: Readonly<Record<MaxAgeErrorCode, string>> = {
  required: i18n.translate('xpack.searchBoost.validation.maxAgeRequired', {
    defaultMessage: 'Enter an age.',
  }),
  outOfRange: i18n.translate('xpack.searchBoost.validation.maxAgeOutOfRange', {
    defaultMessage: 'Enter a whole number from 0 up to {max, number} days.',
    values: { max: MAX_AGE_MAX_DAYS },
  }),
  belowRecent: i18n.translate('xpack.searchBoost.validation.maxAgeBelowRecent', {
    defaultMessage: "Must be at least the recent phase's age.",
  }),
};

const isWithinLimits = (boost: number, { minBoost, maxBoost }: BoostLimits): boolean =>
  Number.isFinite(boost) && boost >= minBoost && boost <= maxBoost;

const outOfRangeError = (limits: BoostLimits): BoostError => ({
  code: 'outOfRange',
  message: getBoostOutOfRangeMessage(limits),
});

export const validateMinBoost = (
  minBoost: number | undefined,
  limits: BoostLimits
): BoostError | undefined => {
  if (minBoost === undefined) {
    return { code: 'required', message: MIN_BOOST_REQUIRED };
  }
  return isWithinLimits(minBoost, limits) ? undefined : outOfRangeError(limits);
};

/**
 * Checks a max boost, `undefined` when it's missing, against the boost limits and the min boost of
 * its period. The comparisons with the min boost wait until the min boost itself is valid.
 */
export const validateMaxBoost = (
  maxBoost: number | undefined,
  minBoost: number | undefined,
  limits: BoostLimits
): BoostError | undefined => {
  if (maxBoost === undefined) {
    return { code: 'required', message: MAX_BOOST_REQUIRED };
  }
  if (!isWithinLimits(maxBoost, limits)) {
    return outOfRangeError(limits);
  }
  if (maxBoost <= 0) {
    return { code: 'notPositive', message: MAX_BOOST_NOT_POSITIVE };
  }
  if (minBoost === undefined || validateMinBoost(minBoost, limits)) {
    return undefined;
  }
  if (maxBoost < minBoost) {
    return { code: 'belowMin', message: MAX_BOOST_BELOW_MIN };
  }
  const { maxRatio } = limits;
  return maxRatio && maxBoost > minBoost * maxRatio
    ? { code: 'aboveRatio', message: getMaxBoostAboveRatioMessage(maxRatio) }
    : undefined;
};

const toHours = ({ value, unit }: MaxAge): number => value * HOURS_PER_UNIT[unit];

const isValidMaxAge = ({ value, unit }: MaxAge): boolean =>
  Number.isSafeInteger(value) && value >= 0 && value <= MAX_AGE_MAX_VALUES[unit];

const maxAgeError = (code: MaxAgeErrorCode): MaxAgeError => ({
  code,
  message: MAX_AGE_MESSAGES[code],
});

/**
 * Checks the max age of a period, `undefined` when it's missing: a whole number of hours or days,
 * up to the maximum. A standard max age can't be below the recent one, once that one is valid.
 */
export const validateMaxAge = (
  maxAge: MaxAge | undefined,
  recentMaxAge?: MaxAge
): MaxAgeError | undefined => {
  if (maxAge === undefined) {
    return maxAgeError('required');
  }
  if (!isValidMaxAge(maxAge)) {
    return maxAgeError('outOfRange');
  }
  return recentMaxAge && isValidMaxAge(recentMaxAge) && toHours(maxAge) < toHours(recentMaxAge)
    ? maxAgeError('belowRecent')
    : undefined;
};

const isMaxAgeUnit = (unit: string): unit is MaxAgeUnit =>
  MAX_AGE_UNITS.some((maxAgeUnit) => maxAgeUnit === unit);

/** Reads a max age in hours or days, such as "12h". A max age of 0 can come in any unit. */
export const parseMaxAge = (maxAge: string): MaxAge | undefined => {
  const parsed = splitTimeValue(maxAge);
  if (!parsed) {
    return undefined;
  }
  const { size, unit } = parsed;
  if (isMaxAgeUnit(unit)) {
    return { value: size, unit };
  }
  return size === 0 ? { value: 0, unit: 'd' } : undefined;
};

/** Such as "12h", as Elasticsearch takes it. */
export const formatMaxAge = ({ value, unit }: MaxAge): string => `${value}${unit}`;
