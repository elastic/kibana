/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoostLimits, MaxAge, MaxAgeUnit } from '../../../common/profile_validation';
import { formatMaxAge, parseMaxAge, validateMaxAge } from '../../../common/profile_validation';
import type {
  BoostAgedPeriod,
  BoostPeriod,
  BoostProfile,
  BoostProfileType,
  DataStreamsBoostProfile,
  IndicesBoostProfile,
} from '../../../common/types';

/** A profile as the boost profile API takes it. */
export type BoostProfileInput =
  | Omit<IndicesBoostProfile, 'is_builtin'>
  | Omit<DataStreamsBoostProfile, 'is_builtin'>;

/** The numbers are the text in their fields, so they can be empty while the user retypes them. */
export interface BoostRangeValues {
  minBoost: string;
  maxBoost: string;
}

export interface AgedPeriodValues extends BoostRangeValues {
  maxAge: string;
  maxAgeUnit: MaxAgeUnit;
}

export interface IndicesValues extends BoostRangeValues {
  oneExtraCopy: boolean;
  prewarm: boolean;
  pinned: boolean;
}

/** The fields of both types, so switching the type keeps what was entered for each. */
export interface ProfileFormValues {
  name: string;
  type: BoostProfileType;
  indices: IndicesValues;
  recent: AgedPeriodValues;
  standard: AgedPeriodValues;
  background: BoostRangeValues;
}

export type BoostRangeFieldsName = 'indices' | 'recent' | 'standard' | 'background';
export type AgedPeriodName = 'recent' | 'standard';

const DEFAULT_MIN_BOOST = 1;

/** Reads a number field, `undefined` when it's empty. */
export const parseNumber = (text: string): number | undefined =>
  text.trim() === '' ? undefined : Number(text);

export const toMaxAge = ({ maxAge, maxAgeUnit }: AgedPeriodValues): MaxAge | undefined => {
  const value = parseNumber(maxAge);
  return value === undefined ? undefined : { value, unit: maxAgeUnit };
};

/**
 * The values a new profile starts with: the default min boost of 1 and the highest max boost the
 * limits allow, for every period, and recent and standard data up to 1 and 7 days old.
 */
export const getDefaultValues = (
  type: BoostProfileType,
  limits: BoostLimits
): ProfileFormValues => {
  const { minBoost: lowest, maxBoost: highest, maxRatio } = limits;
  const minBoost = Math.min(Math.max(DEFAULT_MIN_BOOST, lowest), highest);
  const maxBoost = maxRatio ? Math.min(highest, minBoost * maxRatio) : highest;
  const range: BoostRangeValues = { minBoost: String(minBoost), maxBoost: String(maxBoost) };
  return {
    name: '',
    type,
    indices: { ...range, oneExtraCopy: false, prewarm: false, pinned: false },
    recent: { ...range, maxAge: '1', maxAgeUnit: 'd' },
    standard: { ...range, maxAge: '7', maxAgeUnit: 'd' },
    background: range,
  };
};

const toRangeValues = ({ min_boost: min, max_boost: max }: BoostPeriod): BoostRangeValues => ({
  minBoost: String(min),
  maxBoost: String(max),
});

const toAgedPeriodValues = (period: BoostAgedPeriod): AgedPeriodValues => {
  const maxAge = parseMaxAge(period.max_age);
  return {
    ...toRangeValues(period),
    maxAge: maxAge ? String(maxAge.value) : '',
    maxAgeUnit: maxAge?.unit ?? 'd',
  };
};

/** Fills in the settings of a profile, keeping the name and the values of the other type. */
export const withProfileSettings = (
  values: ProfileFormValues,
  profile: BoostProfile
): ProfileFormValues => {
  if (profile.type === 'indices') {
    const { availability, prewarm, pinned } = profile;
    return {
      ...values,
      indices: {
        ...toRangeValues(profile),
        oneExtraCopy: availability === 'one_extra_copy',
        prewarm,
        pinned: prewarm && pinned,
      },
    };
  }
  return {
    ...values,
    recent: toAgedPeriodValues(profile.recent),
    standard: toAgedPeriodValues(profile.standard),
    background: toRangeValues(profile.background),
  };
};

const toPeriod = ({ minBoost, maxBoost }: BoostRangeValues): BoostPeriod => ({
  min_boost: Number(minBoost),
  max_boost: Number(maxBoost),
});

const toAgedPeriod = (values: AgedPeriodValues): BoostAgedPeriod => ({
  ...toPeriod(values),
  max_age: formatMaxAge({ value: Number(values.maxAge), unit: values.maxAgeUnit }),
});

/** The profile to save, from values that passed validation. */
export const toProfileInput = ({
  name,
  type,
  indices,
  recent,
  standard,
  background,
}: ProfileFormValues): BoostProfileInput => {
  if (type === 'indices') {
    const { oneExtraCopy, prewarm, pinned } = indices;
    return {
      name,
      type,
      ...toPeriod(indices),
      availability: oneExtraCopy ? 'one_extra_copy' : 'base',
      prewarm,
      pinned: prewarm && pinned,
    };
  }
  return {
    name,
    type,
    recent: toAgedPeriod(recent),
    standard: toAgedPeriod(standard),
    background: toPeriod(background),
  };
};

const toTimelineBoost = (text: string, fallback: string): number => {
  const boost = parseNumber(text);
  return boost !== undefined && Number.isFinite(boost) ? boost : Number(fallback);
};

const toTimelinePeriod = (values: BoostRangeValues, fallback: BoostRangeValues): BoostPeriod => ({
  min_boost: toTimelineBoost(values.minBoost, fallback.minBoost),
  max_boost: toTimelineBoost(values.maxBoost, fallback.maxBoost),
});

const toTimelineAgedPeriod = (
  values: AgedPeriodValues,
  fallback: AgedPeriodValues
): BoostAgedPeriod => {
  const maxAge = toMaxAge(values);
  const fallbackMaxAge = toMaxAge(fallback);
  const shownMaxAge = maxAge && !validateMaxAge(maxAge) ? maxAge : fallbackMaxAge;
  return {
    ...toTimelinePeriod(values, fallback),
    max_age: shownMaxAge ? formatMaxAge(shownMaxAge) : '0',
  };
};

/**
 * The data streams profile the form holds, for the timeline. A value that isn't valid, such as an
 * emptied field, shows as it is in `fallback`, so the timeline doesn't jump while the user types.
 */
export const toTimelineProfile = (
  values: ProfileFormValues,
  fallback: ProfileFormValues
): DataStreamsBoostProfile => ({
  name: values.name,
  is_builtin: false,
  type: 'data_streams',
  recent: toTimelineAgedPeriod(values.recent, fallback.recent),
  standard: toTimelineAgedPeriod(values.standard, fallback.standard),
  background: toTimelinePeriod(values.background, fallback.background),
});
