/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { BoostPeriod, DataStreamsBoostProfile } from '../../../common/types';
import { formatBoost } from '../format';

export type BoostPeriodId = 'recent' | 'standard' | 'background';

export interface BoostAge {
  /** As set in the profile, such as "7d". */
  label: string;
  valueInMs: number;
}

export interface BoostPeriodRange {
  id: BoostPeriodId;
  label: string;
  boost: BoostPeriod;
  /** Where the period starts. Left out for the first period that holds data. */
  minAge?: BoostAge;
  /** Left out for the background period, which has no end. */
  maxAge?: BoostAge;
  /** Set when the period never holds data. */
  skippedReason?: string;
}

export const BOOST_PERIOD_LABELS: Readonly<Record<BoostPeriodId, string>> = {
  recent: i18n.translate('xpack.searchBoost.boostPeriods.recent', { defaultMessage: 'Recent' }),
  standard: i18n.translate('xpack.searchBoost.boostPeriods.standard', {
    defaultMessage: 'Standard',
  }),
  background: i18n.translate('xpack.searchBoost.boostPeriods.background', {
    defaultMessage: 'Background',
  }),
};

const RECENT_SKIPPED_REASON = i18n.translate('xpack.searchBoost.boostPeriods.recentSkipped', {
  defaultMessage: 'The recent max age is 0, so no data is ever recent.',
});

const STANDARD_SKIPPED_REASON = i18n.translate('xpack.searchBoost.boostPeriods.standardSkipped', {
  defaultMessage:
    "The standard max age isn't later than the recent max age, so no data is ever standard.",
});

const UNIT_IN_MS: Readonly<Record<string, number>> = {
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

// The `_boost` API only accepts max ages in hours or days.
const AGE_PATTERN = /^(\d+(?:\.\d+)?)([hd])$/;

/** Milliseconds in an Elasticsearch time value such as "7d", or `NaN` when it can't be read. */
export const parseAge = (age: string): number => {
  const match = AGE_PATTERN.exec(age.trim());
  return match ? Number(match[1]) * UNIT_IN_MS[match[2]] : NaN;
};

/** Such as "7 days" for "7d". */
export const formatAge = (age: string): string => {
  const match = AGE_PATTERN.exec(age.trim());
  if (!match) return age;

  const count = Number(match[1]);
  return match[2] === 'd'
    ? i18n.translate('xpack.searchBoost.boostPeriods.days', {
        defaultMessage: '{count, plural, one {# day} other {# days}}',
        values: { count },
      })
    : i18n.translate('xpack.searchBoost.boostPeriods.hours', {
        defaultMessage: '{count, plural, one {# hour} other {# hours}}',
        values: { count },
      });
};

/** Such as "2–5,000". */
export const formatBoostRange = ({ min_boost: min, max_boost: max }: BoostPeriod): string =>
  `${formatBoost(min)}–${formatBoost(max)}`;

/** Such as "Data up to 7 days old". */
export const formatPeriodAges = ({ minAge, maxAge }: BoostPeriodRange): string => {
  if (minAge && maxAge) {
    return i18n.translate('xpack.searchBoost.boostPeriods.betweenAges', {
      defaultMessage: 'Data {minAge}–{maxAge} old',
      values: { minAge: formatAge(minAge.label), maxAge: formatAge(maxAge.label) },
    });
  }
  if (maxAge) {
    return i18n.translate('xpack.searchBoost.boostPeriods.upToAge', {
      defaultMessage: 'Data up to {maxAge} old',
      values: { maxAge: formatAge(maxAge.label) },
    });
  }
  if (minAge) {
    return i18n.translate('xpack.searchBoost.boostPeriods.olderThanAge', {
      defaultMessage: 'Data older than {minAge}',
      values: { minAge: formatAge(minAge.label) },
    });
  }
  return i18n.translate('xpack.searchBoost.boostPeriods.anyAge', {
    defaultMessage: 'Data of any age',
  });
};

const toAge = (label: string): BoostAge => ({ label, valueInMs: parseAge(label) });

/**
 * The periods of a data streams profile, newest data first. A period whose age range is empty
 * (recent max age 0, or standard max age not later than recent) is skipped, and the next one
 * starts where the last period that holds data ends.
 */
export const getBoostPeriods = ({
  recent,
  standard,
  background,
}: DataStreamsBoostProfile): BoostPeriodRange[] => {
  const recentMaxAge = toAge(recent.max_age);
  const standardMaxAge = toAge(standard.max_age);

  const isRecentSkipped = !(recentMaxAge.valueInMs > 0);
  const recentEnd = isRecentSkipped ? undefined : recentMaxAge;
  const isStandardSkipped = !(standardMaxAge.valueInMs > (recentEnd?.valueInMs ?? 0));
  const standardEnd = isStandardSkipped ? recentEnd : standardMaxAge;

  return [
    {
      id: 'recent',
      label: BOOST_PERIOD_LABELS.recent,
      boost: recent,
      maxAge: recentMaxAge,
      ...(isRecentSkipped && { skippedReason: RECENT_SKIPPED_REASON }),
    },
    {
      id: 'standard',
      label: BOOST_PERIOD_LABELS.standard,
      boost: standard,
      minAge: recentEnd,
      maxAge: standardMaxAge,
      ...(isStandardSkipped && { skippedReason: STANDARD_SKIPPED_REASON }),
    },
    {
      id: 'background',
      label: BOOST_PERIOD_LABELS.background,
      boost: background,
      minAge: standardEnd,
    },
  ];
};
