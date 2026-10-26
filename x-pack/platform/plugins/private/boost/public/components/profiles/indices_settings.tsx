/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { IndicesBoostProfile } from '../../../common/types';
import type { DetailsListItem } from '../details/details_list';
import { formatBoostRange } from '../format';
import { INDEX_OPTIONS } from './profile_flyout';

const ON_LABEL = i18n.translate('xpack.boost.profileDetails.on', { defaultMessage: 'On' });
const OFF_LABEL = i18n.translate('xpack.boost.profileDetails.off', { defaultMessage: 'Off' });

const BOOST_LABEL = i18n.translate('xpack.boost.profileDetails.boost', {
  defaultMessage: 'Boost',
});

/** An indices profile's boost range and options, as a details list's items. */
export const getIndicesSettingsItems = (profile: IndicesBoostProfile): DetailsListItem[] => {
  const optionValues = {
    extraCopy: profile.high_availability === 'one_extra_copy',
    prewarm: profile.prewarm,
    pinned: profile.pinned,
  };
  return [
    // One range, as a data streams profile's phases show theirs.
    {
      title: BOOST_LABEL,
      description: formatBoostRange(profile.min_boost, profile.max_boost),
    },
    ...INDEX_OPTIONS.map(({ key, title, description }) => ({
      title,
      tip: description,
      // On stands out in the success color; off is a usual choice, such as to save cost, so it's
      // neutral rather than a warning.
      description: optionValues[key] ? (
        <EuiBadge color="success">{ON_LABEL}</EuiBadge>
      ) : (
        <EuiBadge color="default">{OFF_LABEL}</EuiBadge>
      ),
    })),
  ];
};
