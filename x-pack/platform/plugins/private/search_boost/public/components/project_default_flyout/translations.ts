/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { BoostProfileType } from '../../../common/types';

export const TITLES: Readonly<Record<BoostProfileType, string>> = {
  indices: i18n.translate('xpack.searchBoost.projectDefaultFlyout.indicesTitle', {
    defaultMessage: 'Edit project default for indices',
  }),
  data_streams: i18n.translate('xpack.searchBoost.projectDefaultFlyout.dataStreamsTitle', {
    defaultMessage: 'Edit project default for data streams',
  }),
};

export const SUBTITLES: Readonly<Record<BoostProfileType, (ruleName: string) => string>> = {
  indices: (ruleName) =>
    i18n.translate('xpack.searchBoost.projectDefaultFlyout.indicesSubtitle', {
      defaultMessage:
        'All indices in your project use this boost profile unless a boost rule assigns a different one. Changing it updates "{ruleName}", the default rule.',
      values: { ruleName },
    }),
  data_streams: (ruleName) =>
    i18n.translate('xpack.searchBoost.projectDefaultFlyout.dataStreamsSubtitle', {
      defaultMessage:
        'All data streams in your project use this boost profile unless a boost rule assigns a different one. Changing it updates "{ruleName}", the default rule.',
      values: { ruleName },
    }),
};

export const NO_CUSTOM_PROFILES_TOOLTIPS: Readonly<Record<BoostProfileType, string>> = {
  indices: i18n.translate('xpack.searchBoost.projectDefaultFlyout.noCustomIndicesProfilesTooltip', {
    defaultMessage: 'Create an indices boost profile to use one here.',
  }),
  data_streams: i18n.translate(
    'xpack.searchBoost.projectDefaultFlyout.noCustomDataStreamsProfilesTooltip',
    { defaultMessage: 'Create a data streams boost profile to use one here.' }
  ),
};

export const BOOST_PROFILE_LABEL = i18n.translate(
  'xpack.searchBoost.projectDefaultFlyout.boostProfileLabel',
  { defaultMessage: 'Boost profile' }
);

export const DEFAULT_PROFILE_BADGE = i18n.translate(
  'xpack.searchBoost.projectDefaultFlyout.defaultBadge',
  { defaultMessage: 'Default' }
);

export const CUSTOM_PROFILE_OPTION_LABEL = i18n.translate(
  'xpack.searchBoost.projectDefaultFlyout.customProfileLabel',
  { defaultMessage: 'Custom boost profile' }
);

export const CUSTOM_PROFILE_OPTION_DESCRIPTION = i18n.translate(
  'xpack.searchBoost.projectDefaultFlyout.customProfileDescription',
  { defaultMessage: 'Use one of your own boost profiles.' }
);

export const SELECT_PROFILE_PLACEHOLDER = i18n.translate(
  'xpack.searchBoost.projectDefaultFlyout.selectProfilePlaceholder',
  { defaultMessage: 'Select a profile' }
);

export const NO_CUSTOM_PROFILES_PLACEHOLDER = i18n.translate(
  'xpack.searchBoost.projectDefaultFlyout.noCustomProfiles',
  { defaultMessage: 'No custom profiles yet' }
);

export const CREATE_PROFILE_LINK = i18n.translate(
  'xpack.searchBoost.projectDefaultFlyout.createProfileLink',
  { defaultMessage: 'Create profile' }
);
