/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_BOOST } from '../../../common/constants';
import type {
  BoostPeriod,
  BoostProfile,
  BoostProfileInput,
  BoostProfileType,
} from '../../../common/types';
import type {
  BoostRangeError,
  MaxAge,
  MaxAgeError,
  MaxAgeUnit,
  ProfileNameError,
} from '../../../common/validation';
import {
  formatMaxAge,
  getBoostRangeError,
  getMaxAgeError,
  getProfileNameError,
  parseMaxAge,
} from '../../../common/validation';

// Form fields hold strings so inputs can be empty or mid-edit; they're parsed on validation.

export interface BoostRangeDraft {
  minBoost: string;
  maxBoost: string;
}

export interface AgedPeriodDraft extends BoostRangeDraft {
  maxAge: string;
  maxAgeUnit: MaxAgeUnit;
}

export interface ProfileDraft {
  name: string;
  type: BoostProfileType;
  indices: BoostRangeDraft & { extraCopy: boolean; prewarm: boolean; pinned: boolean };
  dataStreams: { recent: AgedPeriodDraft; standard: AgedPeriodDraft; background: BoostRangeDraft };
}

export interface ProfileDraftErrors {
  name?: ProfileNameError;
  indicesRange?: BoostRangeError;
  recentRange?: BoostRangeError;
  recentMaxAge?: MaxAgeError;
  standardRange?: BoostRangeError;
  standardMaxAge?: MaxAgeError;
  backgroundRange?: BoostRangeError;
}

const toText = (value: number | undefined): string => (value === undefined ? '' : String(value));

const parseNumber = (value: string): number | undefined => {
  const parsed = Number(value);
  return value.trim() === '' || Number.isNaN(parsed) ? undefined : parsed;
};

const rangeDraft = ({ min_boost: min, max_boost: max }: BoostPeriod): BoostRangeDraft => ({
  minBoost: toText(min),
  maxBoost: toText(max),
});

const agedPeriodDraft = (period: BoostPeriod): AgedPeriodDraft => {
  const maxAge = parseMaxAge(period.max_age);
  return { ...rangeDraft(period), maxAge: toText(maxAge?.value), maxAgeUnit: maxAge?.unit ?? 'd' };
};

const toMaxAge = ({ maxAge, maxAgeUnit }: AgedPeriodDraft): MaxAge | undefined => {
  const value = parseNumber(maxAge);
  return value === undefined ? undefined : { value, unit: maxAgeUnit };
};

/** A new profile starts from the out-of-the-box Performant and Last 7 days values. */
export const createEmptyDraft = (): ProfileDraft => ({
  name: '',
  type: 'indices',
  indices: {
    minBoost: '1',
    maxBoost: String(MAX_BOOST),
    extraCopy: false,
    prewarm: false,
    pinned: false,
  },
  dataStreams: {
    recent: { minBoost: '1', maxBoost: String(MAX_BOOST), maxAge: '1', maxAgeUnit: 'd' },
    standard: { minBoost: '1', maxBoost: String(MAX_BOOST), maxAge: '7', maxAgeUnit: 'd' },
    background: { minBoost: '1', maxBoost: String(MAX_BOOST) },
  },
});

export const draftFromProfile = (profile: BoostProfile): ProfileDraft => {
  const draft = { ...createEmptyDraft(), name: profile.name, type: profile.type };

  if (profile.type === 'indices') {
    return {
      ...draft,
      indices: {
        ...rangeDraft(profile),
        extraCopy: profile.high_availability === 'one_extra_copy',
        prewarm: profile.prewarm,
        // Only prewarmed data can be pinned.
        pinned: profile.pinned && profile.prewarm,
      },
    };
  }

  return {
    ...draft,
    dataStreams: {
      recent: agedPeriodDraft(profile.recent),
      standard: agedPeriodDraft(profile.standard),
      background: rangeDraft(profile.background),
    },
  };
};

const getRangeError = ({ minBoost, maxBoost }: BoostRangeDraft) =>
  getBoostRangeError(parseNumber(minBoost), parseNumber(maxBoost));

type ValueErrors = Omit<ProfileDraftErrors, 'name'>;

const getValueErrors = (draft: ProfileDraft): ValueErrors => {
  if (draft.type === 'indices') {
    return { indicesRange: getRangeError(draft.indices) };
  }

  const { recent, standard, background } = draft.dataStreams;
  const recentMaxAge = toMaxAge(recent);

  return {
    recentRange: getRangeError(recent),
    recentMaxAge: getMaxAgeError(recentMaxAge),
    standardRange: getRangeError(standard),
    standardMaxAge: getMaxAgeError(toMaxAge(standard), recentMaxAge),
    backgroundRange: getRangeError(background),
  };
};

/** Returns only the errors that apply to the draft's profile type. */
export const getDraftErrors = (
  draft: ProfileDraft,
  takenNames: readonly string[]
): ProfileDraftErrors => ({
  name: getProfileNameError(draft.name, takenNames),
  ...getValueErrors(draft),
});

export const hasDraftErrors = (errors: ProfileDraftErrors): boolean =>
  Object.values(errors).some((error) => error !== undefined);

const toPeriod = ({ minBoost, maxBoost }: BoostRangeDraft): BoostPeriod => ({
  min_boost: Number(minBoost),
  max_boost: Number(maxBoost),
});

const formatAgedPeriodMaxAge = ({ maxAge, maxAgeUnit }: AgedPeriodDraft): string =>
  formatMaxAge({ value: Number(maxAge), unit: maxAgeUnit });

/** Converts a draft that passed validation into an API payload. */
export const draftToProfileInput = (draft: ProfileDraft): BoostProfileInput => {
  if (draft.type === 'indices') {
    const { extraCopy, prewarm, pinned } = draft.indices;
    return {
      type: 'indices',
      name: draft.name,
      ...toPeriod(draft.indices),
      high_availability: extraCopy ? 'one_extra_copy' : 'none',
      prewarm,
      pinned,
    };
  }

  const { recent, standard, background } = draft.dataStreams;
  return {
    type: 'data_streams',
    name: draft.name,
    recent: { ...toPeriod(recent), max_age: formatAgedPeriodMaxAge(recent) },
    standard: { ...toPeriod(standard), max_age: formatAgedPeriodMaxAge(standard) },
    background: toPeriod(background),
  };
};

/**
 * The draft's settings as a profile, for estimates, or `undefined` while a value is invalid. The
 * name isn't checked, since it doesn't affect cost.
 */
export const getDraftProfile = (draft: ProfileDraft): BoostProfileInput | undefined =>
  hasDraftErrors(getValueErrors(draft)) ? undefined : draftToProfileInput(draft);
