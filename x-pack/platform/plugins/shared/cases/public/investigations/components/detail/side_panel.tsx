/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonGroup,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiNotificationBadge,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { InvestigationRecord } from '../../../../common/investigations/types';
import { ICONS } from '../../icons';
import type { TabId } from '../tabs/tab_props';
import { ExternalTicketCard } from '../external_ticket';
import { AtAGlanceCard, useMessageCount } from './at_a_glance_card';
import { FieldsCard } from './fields_card';
import { RecentActivityCard } from './recent_activity_card';
import { RelatedCard } from './related_card';
import { SideChat } from './side_chat';
import * as i18n from './translations';

export type SidePanelMode = 'context' | 'chat';

export interface SidePanelProps {
  record: InvestigationRecord;
  agentAvailable: boolean;
  activeTab: TabId;
  mode: SidePanelMode;
  onModeChange: (mode: SidePanelMode) => void;
  onClose: () => void;
  onNavigateTab: (tab: TabId) => void;
}

/** The side panel: record context cards, or a compact chat. */
export const SidePanel: React.FC<SidePanelProps> = ({
  record,
  agentAvailable,
  activeTab,
  mode,
  onModeChange,
  onClose,
  onNavigateTab,
}) => {
  const { euiTheme } = useEuiTheme();
  const messageCount = useMessageCount(record);
  // The Conversation tab already is the chat, so the panel only offers context there.
  const isConversationTab = activeTab === 'conversation';
  const effectiveMode: SidePanelMode = isConversationTab ? 'context' : mode;

  return (
    <aside
      aria-label={i18n.SIDE_PANEL_LABEL}
      css={css`
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
      `}
      data-test-subj="investigationSidePanel"
    >
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        gutterSize="s"
        responsive={false}
        css={css`
          flex: 0 0 auto;
          padding: ${euiTheme.size.s} ${euiTheme.size.m};
          border-block-end: ${euiTheme.border.thin};
        `}
      >
        <EuiFlexItem grow={false}>
          {isConversationTab ? (
            <EuiTitle size="xxs">
              <h2>{i18n.CONTEXT}</h2>
            </EuiTitle>
          ) : (
            <EuiButtonGroup
              legend={i18n.SIDE_MODE_LEGEND}
              buttonSize="compressed"
              idSelected={effectiveMode}
              onChange={(id) => onModeChange(id === 'chat' ? 'chat' : 'context')}
              options={[
                {
                  id: 'context',
                  label: i18n.CONTEXT,
                  'data-test-subj': 'investigationSideModeContext',
                },
                {
                  id: 'chat',
                  label: (
                    <>
                      {i18n.CHAT}{' '}
                      <EuiNotificationBadge color="subdued">{messageCount}</EuiNotificationBadge>
                    </>
                  ),
                  'data-test-subj': 'investigationSideModeChat',
                },
              ]}
            />
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={i18n.HIDE_SIDE_PANEL} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType={ICONS.close}
              color="text"
              aria-label={i18n.HIDE_SIDE_PANEL}
              onClick={onClose}
              data-test-subj="investigationSidePanelClose"
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
      <div
        css={css`
          flex: 1 1 auto;
          min-height: 0;
          overflow-y: ${effectiveMode === 'chat' ? 'hidden' : 'auto'};
          padding: ${effectiveMode === 'chat' ? euiTheme.size.s : euiTheme.size.m};
        `}
      >
        {effectiveMode === 'chat' ? (
          <SideChat
            record={record}
            agentAvailable={agentAvailable}
            activeTab={activeTab}
            onCloseChat={() => onModeChange('context')}
          />
        ) : (
          <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <AtAGlanceCard record={record} onNavigateTab={onNavigateTab} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <FieldsCard record={record} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <RelatedCard record={record} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ExternalTicketCard record={record} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <RecentActivityCard record={record} onNavigateTab={onNavigateTab} />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </div>
    </aside>
  );
};
SidePanel.displayName = 'SidePanel';
