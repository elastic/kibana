/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useActivity } from '../../hooks';
import type { InvestigationRecord } from '../../../../common/investigations/types';
import { ActorAvatar } from '../shared/actor_badge';
import { RelativeTime } from '../shared/relative_time';
import type { TabId } from '../tabs/tab_props';
import { SideCard } from './side_card';
import * as i18n from './translations';
import * as sharedI18n from '../shared/translations';

export interface RecentActivityCardProps {
  record: InvestigationRecord;
  onNavigateTab: (tab: TabId) => void;
}

const RECENT_REQUEST = { per_page: 3, sort_order: 'desc' } as const;

/** The three newest activity entries. */
export const RecentActivityCard: React.FC<RecentActivityCardProps> = ({
  record,
  onNavigateTab,
}) => {
  const { euiTheme } = useEuiTheme();
  const { data, isLoading, isError } = useActivity(record.id, RECENT_REQUEST);

  return (
    <SideCard
      title={i18n.RECENT_ACTIVITY}
      action={
        <EuiButtonEmpty
          size="xs"
          onClick={() => onNavigateTab('activity')}
          data-test-subj="investigationRecentActivityViewAll"
        >
          {i18n.VIEW_ALL}
        </EuiButtonEmpty>
      }
      data-test-subj="investigationRecentActivityCard"
    >
      {isLoading ? <EuiLoadingSpinner size="m" /> : null}
      {isError ? (
        <EuiCallOut announceOnMount size="s" color="danger" title={i18n.RECENT_ACTIVITY_ERROR} />
      ) : null}
      {data && data.entries.length === 0 ? (
        <EuiText size="s" color="subdued">
          {i18n.RECENT_ACTIVITY_NONE}
        </EuiText>
      ) : null}
      {data?.entries.map((entry) => (
        <EuiFlexGroup
          key={entry.id}
          gutterSize="s"
          alignItems="flexStart"
          responsive={false}
          css={css`
            padding-block: ${euiTheme.size.xs};
          `}
          data-test-subj="investigationRecentActivityRow"
        >
          <EuiFlexItem grow={false}>
            <ActorAvatar actor={entry.actor} />
          </EuiFlexItem>
          <EuiFlexItem
            css={css`
              min-width: 0;
            `}
          >
            <EuiText size="xs">{entry.message}</EuiText>
            {entry.actor.on_behalf_of ? (
              <EuiText size="xs" color="subdued">
                {sharedI18n.ON_BEHALF_OF(entry.actor.on_behalf_of)}
              </EuiText>
            ) : null}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              <RelativeTime value={entry.ts} />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ))}
    </SideCard>
  );
};
RecentActivityCard.displayName = 'RecentActivityCard';
