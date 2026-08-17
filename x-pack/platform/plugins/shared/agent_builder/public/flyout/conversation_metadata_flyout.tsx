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
import type { ConversationsService } from '../services/conversations/conversations_service';
import { useConversation } from '../application/hooks/use_conversation';
import { getConversationFlyoutTabs } from './conversation_metadata_tabs_registry';

const FLYOUT_TITLE = i18n.translate('xpack.agentBuilder.conversationMetadataFlyout.title', {
  defaultMessage: 'Chat info',
});

const ERROR_BODY = i18n.translate('xpack.agentBuilder.conversationMetadataFlyout.errorBody', {
  defaultMessage: 'Something went wrong while loading this conversation.',
});

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

const buildTabs = (conversation: Conversation): FlyoutTab[] => {
  const customTabs: FlyoutTab[] = [];

  for (const entry of getConversationFlyoutTabs(conversation.template_id ?? '')) {
    // Note: users should likely be able to define their own attachments tab / or at very least filter attachments to relevant ones
    if (entry.tab === 'timeline' || entry.tab === 'attachments') {
      continue;
    }
    customTabs.push({ id: entry.tab, content: entry.content });
  }

  return [
    ...customTabs,
    { id: 'timeline', content: () => <TimelinePlaceholder /> },
    { id: 'attachments', content: () => <AttachmentsPlaceholder /> },
  ];
};

const FlyoutFrame: React.FC<{ titleId: string; children: React.ReactNode }> = ({
  titleId,
  children,
}) => (
  <>
    <EuiFlyoutHeader hasBorder>
      <EuiTitle size="m">
        <h2 id={titleId}>{FLYOUT_TITLE}</h2>
      </EuiTitle>
    </EuiFlyoutHeader>
    <EuiFlyoutBody>{children}</EuiFlyoutBody>
  </>
);

export interface ConversationMetadataFlyoutContentProps {
  conversation: Conversation;
  titleId: string;
}

/** Pure presentational — renders whatever conversation it is given; owns no data fetching. */
export const ConversationMetadataFlyoutContent: React.FC<
  ConversationMetadataFlyoutContentProps
> = ({ conversation, titleId }) => {
  const [selectedTabId, setSelectedTabId] = useState<string | undefined>(undefined);

  useEffect(() => {
    setSelectedTabId(undefined);
  }, [conversation.id]);

  const tabs = useMemo(() => buildTabs(conversation), [conversation]);
  const effectiveSelectedTabId = selectedTabId ?? tabs[0]?.id;
  const selectedTab = tabs.find((tab) => tab.id === effectiveSelectedTabId);

  return (
    <>
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
      <EuiFlyoutBody>{selectedTab?.content({ conversation })}</EuiFlyoutBody>
    </>
  );
};

export interface ConversationMetadataFlyoutSnapshotProps {
  conversationId: string;
  conversationsService: ConversationsService;
  titleId: string;
}

/**
 * Public-contract variant: fetches the conversation once when the flyout opens and renders a
 * point-in-time snapshot. It does NOT live-update — it runs in an isolated per-open QueryClient
 * outside the Agent Builder React tree.
 */
export const ConversationMetadataFlyoutSnapshot: React.FC<
  ConversationMetadataFlyoutSnapshotProps
> = ({ conversationId, conversationsService, titleId }) => {
  const {
    data: conversation,
    isLoading,
    isError,
  } = useQuery({
    // Inline key: this query lives in an isolated per-open QueryClient, so it can never
    // collide with (or be invalidated by) the app's shared query keys.
    queryKey: ['conversation-metadata-flyout-snapshot', conversationId],
    queryFn: () => conversationsService.get({ conversationId }),
  });

  if (isLoading) {
    return (
      <FlyoutFrame titleId={titleId}>
        <EuiLoadingSpinner size="l" />
      </FlyoutFrame>
    );
  }

  if (isError || !conversation) {
    return (
      <FlyoutFrame titleId={titleId}>
        <EuiText size="s" color="danger">
          <p>{ERROR_BODY}</p>
        </EuiText>
      </FlyoutFrame>
    );
  }

  return <ConversationMetadataFlyoutContent conversation={conversation} titleId={titleId} />;
};

export interface ConversationMetadataFlyoutProps {
  onClose: () => void;
}

/**
 * In-chat variant: bound to the active conversation via useConversation(), so the flyout content
 * updates automatically whenever the cached conversation changes — round-end refetch (which is
 * how agent-driven metadata updates land), rename, template apply, or switching conversations.
 */
export const ConversationMetadataFlyout: React.FC<ConversationMetadataFlyoutProps> = ({
  onClose,
}) => {
  const titleId = useGeneratedHtmlId({
    prefix: 'agentBuilderConversationMetadataFlyoutTitle',
  });
  const { conversation, isLoading } = useConversation();

  return (
    <EuiFlyout
      onClose={onClose}
      size="s"
      type="push"
      aria-labelledby={titleId}
      data-test-subj="agentBuilderConversationMetadataFlyout"
    >
      {conversation ? (
        <ConversationMetadataFlyoutContent conversation={conversation} titleId={titleId} />
      ) : (
        <FlyoutFrame titleId={titleId}>
          {isLoading ? (
            <EuiLoadingSpinner size="l" />
          ) : (
            <EuiText size="s" color="danger">
              <p>{ERROR_BODY}</p>
            </EuiText>
          )}
        </FlyoutFrame>
      )}
    </EuiFlyout>
  );
};
