/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiHealth, EuiText, EuiTextColor, EuiToolTip } from '@elastic/eui';
import type {
  BoostProfile,
  DataStreamsBoostProfile,
  IndicesBoostProfile,
} from '../../../../common/types';
import {
  formatBoostRange,
  formatPeriodAges,
  getBoostPeriods,
  useBoostPeriodColors,
} from '../../boost_timeline';
import { DetailsSection } from '../details_section';
import type { SettingsListItem } from '../settings_list';
import { SettingsList } from '../settings_list';
import {
  OFF_LABEL,
  SETTINGS_TITLE,
  ON_LABEL,
  PROFILE_SETTING_DESCRIPTIONS,
  PROFILE_SETTING_LABELS,
  SKIPPED_LABEL,
  formatPeriodBoost,
} from '../../../translations';

const OnOffBadge = ({ isOn }: { isOn: boolean }) => (
  <EuiBadge color={isOn ? 'success' : 'default'}>{isOn ? ON_LABEL : OFF_LABEL}</EuiBadge>
);

const IndicesSettings = ({ profile }: { profile: IndicesBoostProfile }) => (
  <SettingsList
    data-test-subj="searchBoostProfileSettingsList"
    items={[
      {
        id: 'boost',
        label: PROFILE_SETTING_LABELS.boost,
        value: formatBoostRange(profile),
      },
      {
        id: 'oneExtraCopy',
        label: PROFILE_SETTING_LABELS.oneExtraCopy,
        info: PROFILE_SETTING_DESCRIPTIONS.oneExtraCopy,
        value: <OnOffBadge isOn={profile.availability === 'one_extra_copy'} />,
      },
      {
        id: 'prewarm',
        label: PROFILE_SETTING_LABELS.prewarm,
        info: PROFILE_SETTING_DESCRIPTIONS.prewarm,
        value: <OnOffBadge isOn={profile.prewarm} />,
      },
      {
        id: 'pinned',
        label: PROFILE_SETTING_LABELS.pinned,
        info: PROFILE_SETTING_DESCRIPTIONS.pinned,
        value: <OnOffBadge isOn={profile.pinned} />,
      },
    ]}
  />
);

const DataStreamsSettings = ({ profile }: { profile: DataStreamsBoostProfile }) => {
  const colors = useBoostPeriodColors();

  const items = getBoostPeriods(profile).map<SettingsListItem>((period) => ({
    id: period.id,
    label: (
      <EuiHealth color={period.skippedReason ? 'subdued' : colors[period.id]}>
        {period.skippedReason ? (
          <EuiTextColor color="subdued">{period.label}</EuiTextColor>
        ) : (
          period.label
        )}
      </EuiHealth>
    ),
    value: period.skippedReason ? (
      <EuiToolTip content={period.skippedReason}>
        <EuiTextColor color="subdued" tabIndex={0}>
          {SKIPPED_LABEL}
        </EuiTextColor>
      </EuiToolTip>
    ) : (
      <>
        {formatPeriodBoost(formatBoostRange(period.boost))}
        <EuiText size="xs" color="subdued">
          {formatPeriodAges(period)}
        </EuiText>
      </>
    ),
  }));

  return <SettingsList items={items} data-test-subj="searchBoostProfileSettingsList" />;
};

export interface ProfileSettingsProps {
  profile: BoostProfile;
}

export const ProfileSettings = ({ profile }: ProfileSettingsProps) => (
  <DetailsSection title={SETTINGS_TITLE} data-test-subj="searchBoostProfileSettings">
    {profile.type === 'indices' ? (
      <IndicesSettings profile={profile} />
    ) : (
      <DataStreamsSettings profile={profile} />
    )}
  </DetailsSection>
);
