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
import type { ConversationTemplateTabDefinition } from '@kbn/agent-builder-browser';
import type { ConversationsService } from '../services/conversations/conversations_service';
import type { ConversationTemplatesService } from '../services/conversation_templates';
import { useConversation } from '../application/hooks/use_conversation';
import { useAgentBuilderServices } from '../application/hooks/use_agent_builder_service';

const FLYOUT_TITLE = i18n.translate('xpack.agentBuilder.conversationMetadataFlyout.title', {
  defaultMessage: 'Chat info',
});

const ERROR_BODY = i18n.translate('xpack.agentBuilder.conversationMetadataFlyout.errorBody', {
  defaultMessage: 'Something went wrong while loading this conversation.',
});

const TIMELINE_TAB_LABEL = i18n.translate(
  'xpack.agentBuilder.conversationMetadataFlyout.timelineTabLabel',
  { defaultMessage: 'Timeline' }
);

const ATTACHMENTS_TAB_LABEL = i18n.translate(
  'xpack.agentBuilder.conversationMetadataFlyout.attachmentsTabLabel',
  { defaultMessage: 'Attachments' }
);

// Tab ids owned by the flyout itself; registry entries may not claim them.
const RESERVED_TAB_IDS = ['timeline', 'attachments'];

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

const buildTabs = (
  conversation: Conversation,
  conversationTemplatesService: ConversationTemplatesService
): ConversationTemplateTabDefinition[] => {
  const definition = conversation.template_id
    ? conversationTemplatesService.getTemplateUIDefinition(conversation.template_id)
    : undefined;

  const templateTabs =
    definition?.tabs.filter((entry) => !RESERVED_TAB_IDS.includes(entry.tab)) ?? [];

  // Note: users should likely be able to define their own attachments tab / or at very least filter attachments to only show relevant ones
  return [
    ...templateTabs,
    { tab: 'attachments', label: ATTACHMENTS_TAB_LABEL, content: AttachmentsPlaceholder },
    { tab: 'timeline', label: TIMELINE_TAB_LABEL, content: TimelinePlaceholder },
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
  conversationTemplatesService: ConversationTemplatesService;
  titleId: string;
}

/** Pure presenter — renders whatever conversation it is given; owns no data fetching. */
export const ConversationMetadataFlyoutContent: React.FC<
  ConversationMetadataFlyoutContentProps
> = ({ conversation, conversationTemplatesService, titleId }) => {
  const [selectedTabId, setSelectedTabId] = useState<string | undefined>(undefined);

  useEffect(() => {
    setSelectedTabId(undefined);
  }, [conversation.id]);

  const tabs = useMemo(
    () => buildTabs(conversation, conversationTemplatesService),
    [conversation, conversationTemplatesService]
  );
  const effectiveSelectedTabId = selectedTabId ?? tabs[0]?.tab;
  const selectedTab = tabs.find((entry) => entry.tab === effectiveSelectedTabId);
  // Registered tab content may use hooks, so it must render as a component — not be
  // invoked as a plain function inside this component's own render.
  const SelectedTabContent = selectedTab?.content;

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>{FLYOUT_TITLE}</h2>
        </EuiTitle>
        <EuiTabs>
          {tabs.map((entry) => (
            <EuiTab
              key={entry.tab}
              isSelected={entry.tab === effectiveSelectedTabId}
              onClick={() => setSelectedTabId(entry.tab)}
            >
              {entry.label}
            </EuiTab>
          ))}
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {SelectedTabContent && (
          <SelectedTabContent key={selectedTab.tab} conversation={conversation} />
        )}
      </EuiFlyoutBody>
    </>
  );
};

export interface ConversationMetadataFlyoutSnapshotProps {
  conversationId: string;
  conversationsService: ConversationsService;
  conversationTemplatesService: ConversationTemplatesService;
  titleId: string;
}

/**
 * Public-contract variant: fetches the conversation once when the flyout opens and renders a
 * point-in-time snapshot. It does NOT live-update — it runs in an isolated per-open QueryClient
 * outside the Agent Builder React tree; reopen the flyout to get fresh data.
 */
export const ConversationMetadataFlyoutSnapshot: React.FC<
  ConversationMetadataFlyoutSnapshotProps
> = ({ conversationId, conversationsService, conversationTemplatesService, titleId }) => {
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

  return (
    <ConversationMetadataFlyoutContent
      conversation={conversation}
      conversationTemplatesService={conversationTemplatesService}
      titleId={titleId}
    />
  );
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
  const { conversationTemplatesService } = useAgentBuilderServices();

  return (
    <EuiFlyout
      onClose={onClose}
      size="s"
      type="push"
      aria-labelledby={titleId}
      data-test-subj="agentBuilderConversationMetadataFlyout"
    >
      {conversation ? (
        <ConversationMetadataFlyoutContent
          conversation={conversation}
          conversationTemplatesService={conversationTemplatesService}
          titleId={titleId}
        />
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
