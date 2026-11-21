/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiText,
} from '@elastic/eui';
import type { ActivityLink, InvestigationRecord } from '../../../../common/investigations/types';
import { useSinceLastHandoff, useInvestigationsNavigation } from '../../hooks';
import { ICONS } from '../../icons';
import { RelativeTime } from '../shared/relative_time';
import { isTabId } from '../tabs/tab_props';
import type { TabId } from '../tabs/tab_props';
import { OverviewCard } from './overview_card';
import * as i18n from './translations';

export interface SinceCardProps {
  record: InvestigationRecord;
  onNavigateTab: (tab: TabId, opts?: { itemId?: string }) => void;
  onOpenClaim: (claimId: string) => void;
}

/** What changed since the last handoff. Renders nothing when nothing changed. */
export const SinceCard: React.FC<SinceCardProps> = ({ record, onNavigateTab, onOpenClaim }) => {
  const { data } = useSinceLastHandoff(record.id, undefined);
  const { navigate, getRecordPath } = useInvestigationsNavigation();

  if (!data || data.items.length === 0) {
    return null;
  }

  const openTarget = (target: ActivityLink, key?: string) => {
    if (
      target.kind === 'tab' &&
      target.id === 'evidence' &&
      (key === 'alerts' || key === 'indicators')
    ) {
      // Open Evidence filtered to what arrived since the handoff.
      navigate(`${getRecordPath(record.id, { tab: 'evidence' })}&ev_new=1`);
    } else if (target.kind === 'tab' && isTabId(target.id)) {
      onNavigateTab(target.id);
    } else if (target.kind === 'claim' && target.id) {
      onOpenClaim(target.id);
    } else if (target.kind === 'evidence') {
      onNavigateTab('evidence', target.id ? { itemId: target.id } : undefined);
    }
  };

  const isActionable = (target: ActivityLink | null | undefined): target is ActivityLink =>
    Boolean(
      target &&
        ((target.kind === 'tab' && isTabId(target.id)) ||
          (target.kind === 'claim' && target.id) ||
          target.kind === 'evidence')
    );

  return (
    <OverviewCard
      title={i18n.SINCE_LAST_HANDOFF}
      tone="warning"
      data-test-subj="investigationSinceCard"
      action={
        data.since ? (
          <EuiText size="xs" color="subdued" data-test-subj="investigationSinceWhen">
            {data.handoff_by ? i18n.HANDED_OFF_BY(data.handoff_by.name) : i18n.HANDED_OFF}{' '}
            <RelativeTime value={data.since} />
          </EuiText>
        ) : null
      }
    >
      {data.items.map((item, index) => (
        <React.Fragment key={item.key}>
          {index > 0 ? <EuiHorizontalRule margin="xs" /> : null}
          <EuiFlexGroup
            gutterSize="m"
            alignItems="center"
            justifyContent="spaceBetween"
            responsive={false}
            data-test-subj={`investigationSinceRow-${item.key}`}
          >
            <EuiFlexItem>
              <EuiText size="s">
                <strong>{item.headline}</strong>
              </EuiText>
              <EuiText size="xs" color="subdued">
                {item.detail}
              </EuiText>
            </EuiFlexItem>
            {isActionable(item.target) ? (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  iconType={ICONS.chevronRight}
                  iconSide="right"
                  onClick={() => item.target && openTarget(item.target, item.key)}
                  data-test-subj={`investigationSinceAction-${item.key}`}
                >
                  {item.target.label ?? i18n.OPEN}
                </EuiButtonEmpty>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </React.Fragment>
      ))}
    </OverviewCard>
  );
};
SinceCard.displayName = 'SinceCard';
