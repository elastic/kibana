/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { BoostProfile, BoostProfileType, BoostRuleMatch } from '../../../common/types';
import { formatTargetCount } from '../../translations';
import { BoostTimeline } from '../boost_timeline';
import { formatStorageSize } from '../format';
import { MatchesBadge } from '../matches_badge/matches_badge';

const APPLIES_TO_TITLE = i18n.translate('xpack.searchBoost.appliesToFooter.title', {
  defaultMessage: 'Applies to',
});

const getShowMatchesAriaLabel = (type: BoostProfileType, count: number): string =>
  i18n.translate('xpack.searchBoost.appliesToFooter.showMatches', {
    defaultMessage: '{targetCount}. Show what this applies to',
    values: { targetCount: formatTargetCount(type, count) },
  });

export interface AppliesToFooterProps {
  type: BoostProfileType;
  /** The indices or data streams covered. */
  matches: readonly BoostRuleMatch[];
  storageSizeInBytes: number;
  /** For data streams, the profile whose periods the timeline shows. */
  profile?: BoostProfile;
}

/** What a rule or profile applies to, shown above a flyout's buttons. */
export const AppliesToFooter = ({
  type,
  matches,
  storageSizeInBytes,
  profile,
}: AppliesToFooterProps) => (
  <div data-test-subj="searchBoostAppliesToFooter">
    <EuiFlexGroup
      justifyContent="spaceBetween"
      alignItems="center"
      gutterSize="s"
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxxs">
          <span>{APPLIES_TO_TITLE}</span>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadgeGroup gutterSize="s">
          <MatchesBadge
            type={type}
            matches={matches}
            getOnClickAriaLabel={(count) => getShowMatchesAriaLabel(type, count)}
            data-test-subj="searchBoostAppliesToCount"
          />
          <EuiBadge color="hollow" data-test-subj="searchBoostAppliesToSize">
            {formatStorageSize(storageSizeInBytes)}
          </EuiBadge>
        </EuiBadgeGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
    {profile?.type === 'data_streams' ? (
      <>
        <EuiSpacer size="s" />
        <BoostTimeline profile={profile} />
      </>
    ) : null}
  </div>
);
