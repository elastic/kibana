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
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import type { Conversation } from '@kbn/agent-builder-common';
import type { ConversationTemplateTabDefinition } from '@kbn/agent-builder-browser';
import { BUILTIN_TAB_IDS } from '@kbn/agent-builder-browser';
import type { ConversationsService } from '../services/conversations/conversations_service';
import type { ConversationTemplatesService } from '../services/conversation_templates';
import { useConversation } from '../application/hooks/use_conversation';
import { useAgentBuilderServices } from '../application/hooks/use_agent_builder_service';

const FLYOUT_TITLE = i18n.translate('xpack.agentBuilder.conversationDetailsFlyout.title', {
  defaultMessage: 'Chat info',
});

const ERROR_BODY = i18n.translate('xpack.agentBuilder.conversationDetailsFlyout.errorBody', {
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

  const builtinTabIds: readonly string[] = BUILTIN_TAB_IDS;
  const templateTabIds = (definition?.tabs ?? []).filter((id) => !builtinTabIds.includes(id));
  const tabIds = [...templateTabIds, ...builtinTabIds];

  return tabIds.flatMap((id) => {
    const tab = conversationTemplatesService.getTab(id);
    return tab ? [{ id, ...tab }] : [];
  });
};

interface FlyoutFrameProps {
  titleId: string;
  tabs?: React.ReactNode;
  children: React.ReactNode;
}

const FlyoutFrame = ({ titleId, tabs, children }: FlyoutFrameProps) => {
  const { euiTheme } = useEuiTheme();

  // Align the selected-tab underline with the flyout header border.
  const tabsStyles = css`
    margin-block-end: calc(-${euiTheme.size.base} - ${euiTheme.border.width.thin});
  `;

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="xs">
          <h4 id={titleId}>{FLYOUT_TITLE}</h4>
        </EuiTitle>
        {tabs && (
          <EuiTabs css={tabsStyles} bottomBorder={false}>
            {tabs}
          </EuiTabs>
        )}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{children}</EuiFlyoutBody>
    </>
  );
};

export interface ConversationDetailsFlyoutContentProps {
  conversation: Conversation;
  conversationTemplatesService: ConversationTemplatesService;
  titleId: string;
}

/** Presentational only — renders whatever conversation it is given; not responsible for data fetching. */
export const ConversationDetailsFlyoutContent = ({
  conversation,
  conversationTemplatesService,
  titleId,
}: ConversationDetailsFlyoutContentProps) => {
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
  // Render as a component so registered tabs can use hooks.
  const SelectedTabContent = selectedTab?.content;

  return (
    <FlyoutFrame
      titleId={titleId}
      tabs={tabs.map((entry) => (
        <EuiTab
          key={entry.id}
          isSelected={entry.id === effectiveSelectedTabId}
          onClick={() => setSelectedTabId(entry.id)}
        >
          {entry.label}
        </EuiTab>
      ))}
    >
      {SelectedTabContent && (
        <SelectedTabContent key={selectedTab.id} conversation={conversation} />
      )}
    </FlyoutFrame>
  );
};

export interface ConversationDetailsFlyoutSnapshotProps {
  conversationId: string;
  conversationsService: ConversationsService;
  conversationTemplatesService: ConversationTemplatesService;
  titleId: string;
}

/** Snapshot variant backed by an isolated, per-open query cache. */
export const ConversationDetailsFlyoutSnapshot = ({
  conversationId,
  conversationsService,
  conversationTemplatesService,
  titleId,
}: ConversationDetailsFlyoutSnapshotProps) => {
  const {
    data: conversation,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['conversation-details-flyout-snapshot', conversationId],
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
    <ConversationDetailsFlyoutContent
      conversation={conversation}
      conversationTemplatesService={conversationTemplatesService}
      titleId={titleId}
    />
  );
};

export interface ConversationDetailsFlyoutProps {
  onClose: () => void;
}

/** Live variant backed by the active conversation cache. */
export const ConversationDetailsFlyout = ({ onClose }: ConversationDetailsFlyoutProps) => {
  const titleId = useGeneratedHtmlId({
    prefix: 'agentBuilderConversationDetailsFlyoutTitle',
  });
  const { conversation, isLoading } = useConversation();
  const { conversationTemplatesService } = useAgentBuilderServices();

  return (
    <EuiFlyout
      onClose={onClose}
      size="s"
      type="push"
      paddingSize="m"
      role="region"
      aria-labelledby={titleId}
      data-test-subj="agentBuilderConversationDetailsFlyout-live"
    >
      {conversation ? (
        <ConversationDetailsFlyoutContent
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
