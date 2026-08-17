/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiTabs,
  EuiTab,
  EuiText,
  EuiLoadingSpinner,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import type { Conversation } from '@kbn/agent-builder-common';
import { useAgentBuilderServices } from '../application/hooks/use_agent_builder_service';

const FLYOUT_TITLE = i18n.translate('xpack.agentBuilder.conversationMetadataFlyout.title', {
  defaultMessage: 'Chat info',
});

interface ConversationMetadataFlyoutProps {
  conversationId: string;
  onClose: () => void;
}

interface FlyoutTab {
  id: string;
  content: (props: { conversation: Conversation }) => React.ReactNode;
}

const TimelinePlaceholder: React.FC = () => (
  <EuiText size="s" color="subdued">
    <p>
      {i18n.translate('xpack.agentBuilder.conversationMetadataFlyout.timelinePlaceholder', {
        defaultMessage: 'Timeline coming soon.',
      })}
    </p>
  </EuiText>
);

const AttachmentsPlaceholder: React.FC = () => (
  <EuiText size="s" color="subdued">
    <p>
      {i18n.translate('xpack.agentBuilder.conversationMetadataFlyout.attachmentsPlaceholder', {
        defaultMessage: 'Attachments coming soon.',
      })}
    </p>
  </EuiText>
);

const tabLabel = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);

const TABS: FlyoutTab[] = [
  { id: 'timeline', content: () => <TimelinePlaceholder /> },
  { id: 'attachments', content: () => <AttachmentsPlaceholder /> },
];

export const ConversationMetadataFlyout: React.FC<ConversationMetadataFlyoutProps> = ({
  conversationId,
  onClose,
}) => {
  const titleId = useGeneratedHtmlId({ prefix: 'agentBuilderConversationMetadataFlyoutTitle' });
  const { conversationsService } = useAgentBuilderServices();
  const [selectedTabId, setSelectedTabId] = useState<string | undefined>(undefined);

  useEffect(() => {
    setSelectedTabId(undefined);
  }, [conversationId]);

  const {
    data: conversation,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['conversation-metadata-flyout', conversationId],
    queryFn: () => conversationsService.get({ conversationId }),
  });

  const tabs = useMemo(() => TABS, []);
  const effectiveSelectedTabId = selectedTabId ?? tabs[0]?.id;
  const selectedTab = tabs.find((tab) => tab.id === effectiveSelectedTabId);

  return (
    <EuiFlyout
      onClose={onClose}
      size="s"
      type="push"
      aria-labelledby={titleId}
      data-test-subj="agentBuilderConversationMetadataFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>{FLYOUT_TITLE}</h2>
        </EuiTitle>
        <EuiTabs>
          {tabs.map((tab) => (
            <EuiTab
              key={tab.id}
              isSelected={tab.id === effectiveSelectedTabId}
              onClick={() => setSelectedTabId(tab.id)}
            >
              {tabLabel(tab.id)}
            </EuiTab>
          ))}
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {isLoading && <EuiLoadingSpinner size="l" />}
        {isError && (
          <EuiText size="s" color="danger">
            <p>
              {i18n.translate('xpack.agentBuilder.conversationMetadataFlyout.errorBody', {
                defaultMessage: 'Something went wrong while loading this conversation.',
              })}
            </p>
          </EuiText>
        )}
        {conversation && selectedTab?.content({ conversation })}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
