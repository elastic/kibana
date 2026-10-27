/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { MAX_BOOST, MIN_BOOST } from '../../../common/constants';
import type { BoostRangeError, MaxAgeError, ProfileNameError } from '../../../common/validation';
import { MAX_AGE_MAX_DAYS, PROFILE_NAME_MAX_LENGTH } from '../../../common/validation';

export const PROFILE_NAME_HELP = i18n.translate('xpack.boost.profileForm.nameHelp', {
  defaultMessage: 'Lowercase letters, numbers, hyphens, and underscores.',
});

export const PROFILE_NAME_ERROR_MESSAGES: Readonly<Record<ProfileNameError, string>> = {
  required: i18n.translate('xpack.boost.profileForm.nameRequired', {
    defaultMessage: 'Enter a name.',
  }),
  too_long: i18n.translate('xpack.boost.profileForm.nameTooLong', {
    defaultMessage: 'Use {max} characters or fewer.',
    values: { max: PROFILE_NAME_MAX_LENGTH },
  }),
  invalid_characters: i18n.translate('xpack.boost.profileForm.nameInvalid', {
    defaultMessage:
      'Use lowercase letters, numbers, hyphens, and underscores, starting with a letter or number.',
  }),
  already_exists: i18n.translate('xpack.boost.profileForm.nameTaken', {
    defaultMessage: 'A boost profile with this name already exists.',
  }),
};

const minBoostRequired = i18n.translate('xpack.boost.profileForm.minRequired', {
  defaultMessage: 'Enter a minimum boost.',
});
const maxBoostRequired = i18n.translate('xpack.boost.profileForm.maxRequired', {
  defaultMessage: 'Enter a maximum boost.',
});
const boostOutOfRange = i18n.translate('xpack.boost.profileForm.boostOutOfRange', {
  defaultMessage: 'Enter a value from {min} to {max}.',
  values: { min: MIN_BOOST, max: MAX_BOOST.toLocaleString(i18n.getLocale()) },
});

/** Each range error belongs to either the minimum or the maximum field. */
export const BOOST_RANGE_ERROR_MESSAGES: Readonly<
  Record<BoostRangeError, { field: 'min' | 'max'; message: string }>
> = {
  min_required: { field: 'min', message: minBoostRequired },
  max_required: { field: 'max', message: maxBoostRequired },
  min_out_of_range: { field: 'min', message: boostOutOfRange },
  max_out_of_range: { field: 'max', message: boostOutOfRange },
  max_not_positive: {
    field: 'max',
    message: i18n.translate('xpack.boost.profileForm.maxNotPositive', {
      defaultMessage: 'Maximum boost must be greater than 0.',
    }),
  },
  max_below_min: {
    field: 'max',
    message: i18n.translate('xpack.boost.profileForm.maxBelowMin', {
      defaultMessage: 'Maximum boost must be at least the minimum boost.',
    }),
  },
};

export const MAX_AGE_ERROR_MESSAGES: Readonly<Record<MaxAgeError, string>> = {
  required: i18n.translate('xpack.boost.profileForm.maxAgeRequired', {
    defaultMessage: 'Enter an age.',
  }),
  out_of_range: i18n.translate('xpack.boost.profileForm.maxAgeOutOfRange', {
    defaultMessage: 'Enter a whole number of at least 1, up to {max} days.',
    values: { max: MAX_AGE_MAX_DAYS.toLocaleString(i18n.getLocale()) },
  }),
  below_previous_period: i18n.translate('xpack.boost.profileForm.maxAgeBelowRecent', {
    defaultMessage: "Must be at least the recent phase's age.",
  }),
};
