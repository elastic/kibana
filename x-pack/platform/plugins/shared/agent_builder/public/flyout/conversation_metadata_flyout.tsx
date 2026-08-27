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
import { BUILTIN_TAB_IDS } from '@kbn/agent-builder-browser';
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

type ResolvedTab = ConversationTemplateTabDefinition & { id: string };

const buildTabs = (
  conversation: Conversation,
  conversationTemplatesService: ConversationTemplatesService
): ResolvedTab[] => {
  const definition = conversation.template_id
    ? conversationTemplatesService.getTemplateUIDefinition(conversation.template_id)
    : undefined;

  // Builtin tabs always render after the template's tabs; there is no reordering mechanism yet.
  const builtinTabIds: readonly string[] = BUILTIN_TAB_IDS;
  const templateTabIds = (definition?.tabs ?? []).filter((id) => !builtinTabIds.includes(id));
  const tabIds = [...templateTabIds, ...builtinTabIds];

  // Resolve at render time so registration order across plugins does not matter;
  // ids with no registered tab are skipped.
  return tabIds.flatMap((id) => {
    const tab = conversationTemplatesService.getTab(id);
    return tab ? [{ id, ...tab }] : [];
  });
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
  const effectiveSelectedTabId = selectedTabId ?? tabs[0]?.id;
  const selectedTab = tabs.find((entry) => entry.id === effectiveSelectedTabId);
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
              key={entry.id}
              isSelected={entry.id === effectiveSelectedTabId}
              onClick={() => setSelectedTabId(entry.id)}
            >
              {entry.label}
            </EuiTab>
          ))}
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {SelectedTabContent && (
          <SelectedTabContent key={selectedTab.id} conversation={conversation} />
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
      data-test-subj="agentBuilderConversationMetadataFlyout-live"
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
