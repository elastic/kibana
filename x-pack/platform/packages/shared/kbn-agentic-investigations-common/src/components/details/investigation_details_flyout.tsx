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
} from '@elastic/eui';
import type { Investigation } from '../../types';
import { ConversationDetailsFlyoutHeader } from './flyout_header';
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
}: InvestigationDetailsFlyoutProps) => {
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
      aria-labelledby={titleId}
      data-test-subj="investigationDetailsFlyout"
    >
      <EuiFlyoutHeader hasBorder css={{ borderBlockEnd: 'none' }}>
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
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {!investigation ? (
          <EuiSkeletonText
            lines={6}
            isLoading={isLoading}
            data-test-subj="investigationDetailsFlyoutBodySkeleton"
          />
        ) : activeTab === 'overview' ? (
          <OverviewTab investigation={investigation} />
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
