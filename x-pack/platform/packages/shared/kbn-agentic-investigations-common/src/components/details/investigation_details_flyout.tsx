/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSkeletonText,
  EuiSkeletonTitle,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  useGeneratedHtmlId,
  useEuiTheme,
} from '@elastic/eui';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import type { Investigation } from '../../types';
import { ConversationDetailsFlyoutHeader } from './flyout_header';
import { ConversationDetailsFlyoutMenuBar } from './flyout_menu_bar';
import { ConversationDetailsFlyoutFooter } from './flyout_footer';
import { OverviewTab, TimelineTab } from './details_flyout_tab_contents';
import { DETAILS_FLYOUT_LABELS } from './translations';

/**
 * Tabs the conversation details flyout can show. `attachments` is only reachable from the Agent
 * Builder host, which has the conversation the attachments belong to.
 */
export const INVESTIGATION_FLYOUT_TABS = ['overview', 'attachments', 'timeline'] as const;
export type InvestigationFlyoutTab = (typeof INVESTIGATION_FLYOUT_TABS)[number];

/** Tabs this host can render; `attachments` needs a conversation, which it does not have. */
const LOCAL_TABS = [
  { id: 'overview', label: DETAILS_FLYOUT_LABELS.tabs.overview },
  { id: 'timeline', label: DETAILS_FLYOUT_LABELS.tabs.timeline },
] as const satisfies ReadonlyArray<{ id: InvestigationFlyoutTab; label: string }>;

type LocalTab = (typeof LOCAL_TABS)[number]['id'];

const isLocalTab = (tab: InvestigationFlyoutTab): tab is LocalTab =>
  LOCAL_TABS.some(({ id }) => id === tab);

export interface InvestigationDetailsFlyoutProps {
  /** Omitted while loading, or when nothing matches the requested conversation. */
  investigation?: Investigation;
  isLoading: boolean;
  selectedTab: InvestigationFlyoutTab;
  onSelectTab: (tab: InvestigationFlyoutTab) => void;
  onClose: () => void;
  onOpenChat: () => void;
  /**
   * Solution-specific content rendered as an "Attachment summary" section beneath the overview.
   * Kept as an opaque slot so this shared host stays solution-agnostic — AlertZero fills it.
   */
  attachmentsSlot?: React.ReactNode;
}

/**
 * Renders the investigation flyout from a page that already holds the `Investigation`.
 *
 * This is the second host for the same header/tab/footer components Agent Builder renders through
 * the conversation template registry. It exists because an AlertZero investigation has no Agent
 * Builder conversation id yet, so `openConversationDetails` has nothing to resolve. Once
 * investigations are backed by conversations this host can go and the registry becomes the only one.
 */
export const InvestigationDetailsFlyout = ({
  investigation,
  isLoading,
  selectedTab,
  onSelectTab,
  onClose,
  onOpenChat,
  attachmentsSlot,
}: InvestigationDetailsFlyoutProps) => {
  const { euiTheme } = useEuiTheme();
  const titleId = useGeneratedHtmlId({ prefix: 'investigationDetailsFlyoutTitle' });
  // TODO: A tab this host cannot render (`attachments`) falls back rather than showing an empty body.
  // update this in case attachments/timeline come back in MVP
  const activeTab: LocalTab = isLocalTab(selectedTab) ? selectedTab : 'overview';

  return (
    <EuiFlyout
      type="push"
      size="s"
      paddingSize="m"
      onClose={onClose}
      ownFocus={false}
      hideCloseButton
      // Join EUI's flyout manager as a managed main flyout under the same history group the alert
      // flyout uses (in AlertZero the alert falls back to DOC_VIEWER_FLYOUT_HISTORY_KEY). With a
      // shared `historyKey` + `session="start"`, opening the alert stacks in the same group and EUI
      // renders a Back button to return here. Without `session` the flyout is unmanaged and joins no
      // group, which is why there was no Back before.
      session="start"
      historyKey={DOC_VIEWER_FLYOUT_HISTORY_KEY}
      aria-labelledby={titleId}
      data-test-subj="investigationDetailsFlyout"
    >
      <EuiFlyoutHeader hasBorder css={{ paddingBlock: `${euiTheme.size.m} !important` }}>
        <ConversationDetailsFlyoutMenuBar onClose={onClose} />
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <div id={titleId}>
          {investigation ? (
            <ConversationDetailsFlyoutHeader investigation={investigation} />
          ) : (
            <EuiSkeletonTitle
              size="s"
              isLoading={isLoading}
              data-test-subj="investigationDetailsFlyoutHeaderSkeleton"
            />
          )}
        </div>
        <EuiSpacer size="m" />
        <EuiTabs size="m">
          {LOCAL_TABS.map(({ id, label }) => (
            <EuiTab
              key={id}
              isSelected={activeTab === id}
              disabled={!investigation}
              onClick={() => onSelectTab(id)}
            >
              {label}
            </EuiTab>
          ))}
        </EuiTabs>
        <EuiSpacer size="m" />
        {!investigation ? (
          <EuiSkeletonText
            lines={6}
            isLoading={isLoading}
            data-test-subj="investigationDetailsFlyoutBodySkeleton"
          />
        ) : activeTab === 'overview' ? (
          <>
            <OverviewTab investigation={investigation} />
            {attachmentsSlot ? (
              <>
                <EuiSpacer size="l" />
                {attachmentsSlot}
              </>
            ) : null}
          </>
        ) : (
          <TimelineTab events={investigation.events} />
        )}
      </EuiFlyoutBody>

      {investigation ? (
        <EuiFlyoutFooter>
          <ConversationDetailsFlyoutFooter investigation={investigation} onOpenChat={onOpenChat} />
        </EuiFlyoutFooter>
      ) : null}
    </EuiFlyout>
  );
};
