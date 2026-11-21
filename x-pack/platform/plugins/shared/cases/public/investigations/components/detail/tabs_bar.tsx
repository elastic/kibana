/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiNotificationBadge,
  EuiTab,
  EuiTabs,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { InvestigationRecord } from '../../../../common/investigations/types';
import { ICONS } from '../../icons';
import type { TabId } from '../tabs/tab_props';
import { TAB_IDS } from '../tabs/tab_props';
import * as tabI18n from '../tabs/translations';
import * as i18n from './translations';

const TAB_LABELS: Record<TabId, string> = {
  overview: tabI18n.OVERVIEW,
  conversation: tabI18n.CONVERSATION,
  evidence: tabI18n.EVIDENCE,
  scope: tabI18n.SCOPE,
  procedure: tabI18n.PROCEDURE,
  activity: tabI18n.ACTIVITY,
};

/** The count shown next to a tab, or undefined when the tab has none. */
export const getTabCount = (tab: TabId, record: InvestigationRecord): string | undefined => {
  const { counters } = record;
  switch (tab) {
    case 'conversation': {
      const count = record.threads.length + (record.conversation_id ? 1 : 0);
      return count > 0 ? String(count) : undefined;
    }
    case 'evidence':
      return String(counters.evidence);
    case 'scope':
      return String(counters.entities_in_scope);
    case 'procedure':
      return counters.tasks > 0
        ? `${counters.tasks_done}/${counters.tasks - counters.tasks_skipped}`
        : undefined;
    case 'activity':
      return String(counters.activity + counters.timeline_events);
    default:
      return undefined;
  }
};

export interface TabsBarProps {
  record: InvestigationRecord;
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  isSidePanelOpen: boolean;
  onShowSidePanel: () => void;
}

export const TabsBar: React.FC<TabsBarProps> = ({
  record,
  activeTab,
  onSelectTab,
  isSidePanelOpen,
  onShowSidePanel,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="spaceBetween"
      gutterSize="m"
      responsive={false}
      css={css`
        flex: 0 0 auto;
        border-block-end: ${euiTheme.border.thin};
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiTabs
          aria-label={i18n.TABS_LABEL}
          bottomBorder={false}
          css={css`
            box-shadow: none;
          `}
          data-test-subj="investigationTabs"
        >
          {TAB_IDS.map((tab) => {
            const count = getTabCount(tab, record);
            return (
              <EuiTab
                key={tab}
                isSelected={tab === activeTab}
                onClick={() => onSelectTab(tab)}
                append={
                  count !== undefined ? (
                    <EuiNotificationBadge color="subdued">{count}</EuiNotificationBadge>
                  ) : undefined
                }
                data-test-subj={`investigationTab-${tab}`}
              >
                {TAB_LABELS[tab]}
              </EuiTab>
            );
          })}
        </EuiTabs>
      </EuiFlexItem>
      {isSidePanelOpen ? null : (
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            iconType={ICONS.chevronLeft}
            onClick={onShowSidePanel}
            data-test-subj="investigationShowSidePanel"
          >
            {i18n.SHOW_SIDE_PANEL}
          </EuiButton>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
TabsBar.displayName = 'TabsBar';
