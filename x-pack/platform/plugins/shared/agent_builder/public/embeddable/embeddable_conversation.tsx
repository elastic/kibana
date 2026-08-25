/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTab,
  EuiTabs,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { EmbeddableConversationInternalProps } from './types';
import { EmbeddableConversationsProvider } from '../application/context/conversation/embeddable_conversations_provider';
import { Conversation } from '../application/components/conversations/conversation';
import { EmbeddableConversationHeader } from '../application/components/conversations/embeddable_conversation_header/embeddable_conversation_header';
import {
  conversationBackgroundStyles,
  headerHeight,
} from '../application/components/conversations/conversation.styles';
import { EmbeddableWelcomeMessage } from './embeddable_welcome_message';
import { EmbeddableAccessBoundary } from './embeddable_access_boundary';
import { useAgentBuilderServices } from '../application/hooks/use_agent_builder_service';
import { useConversation } from '../application/hooks/use_conversation';

const CHAT_TAB_ID = '__chat__';

const chatLabel = i18n.translate('agentBuilder.embeddable.tabs.chat', {
  defaultMessage: 'Chat',
});

/**
 * Renders the body section of the sidebar: tabs (when the conversation has a template with
 * registered UI tabs) plus either the active template tab content or the chat.
 * Must live inside EmbeddableConversationsProvider so it can read conversation + services.
 */
function TemplateAwareBody(): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const { conversationTemplatesService } = useAgentBuilderServices();
  const { conversation } = useConversation();
  const [selectedTabId, setSelectedTabId] = useState<string>(CHAT_TAB_ID);

  const uiDef = conversation?.template_id
    ? conversationTemplatesService.getTemplateUIDefinition(conversation.template_id)
    : undefined;

  const resolvedTabs = (uiDef?.tabs ?? [])
    .map((id) => ({ id, def: conversationTemplatesService.getTab(id) }))
    .filter(
      (t): t is { id: string; def: NonNullable<ReturnType<typeof conversationTemplatesService.getTab>> } =>
        t.def != null
    );

  const hasTabs = resolvedTabs.length > 0;

  // If the selected tab no longer exists (e.g. conversation switched), fall back to chat.
  const activeTabId =
    selectedTabId === CHAT_TAB_ID || resolvedTabs.some((t) => t.id === selectedTabId)
      ? selectedTabId
      : CHAT_TAB_ID;

  const ActiveTabContent =
    activeTabId !== CHAT_TAB_ID
      ? resolvedTabs.find((t) => t.id === activeTabId)?.def.content ?? null
      : null;

  const bodyStyles = css`
    flex: 1;
    min-height: 0;

    .euiFlyoutBody__overflow {
      overflow: hidden;
      height: 100%;
    }

    .euiFlyoutBody__overflowContent {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100%;
      overflow: hidden;
      padding: 0;
    }
  `;

  const tabContentStyles = css`
    flex: 1;
    overflow-y: auto;
    padding: ${euiTheme.size.base};
  `;

  return (
    <>
      {hasTabs && (
        <EuiTabs size="s" css={css`padding-inline: ${euiTheme.size.base};`}>
          <EuiTab
            isSelected={activeTabId === CHAT_TAB_ID}
            onClick={() => setSelectedTabId(CHAT_TAB_ID)}
          >
            {chatLabel}
          </EuiTab>
          {resolvedTabs.map(({ id, def }) => (
            <EuiTab
              key={id}
              isSelected={activeTabId === id}
              onClick={() => setSelectedTabId(id)}
            >
              {def.label}
            </EuiTab>
          ))}
        </EuiTabs>
      )}

      {ActiveTabContent && conversation ? (
        <div css={tabContentStyles}>
          <ActiveTabContent conversation={conversation} />
        </div>
      ) : (
        <EuiFlyoutBody css={bodyStyles}>
          <Conversation />
        </EuiFlyoutBody>
      )}
    </>
  );
}

export const EmbeddableConversationInternal: React.FC<EmbeddableConversationInternalProps> = (
  props
) => {
  const { euiTheme } = useEuiTheme();
  const { onClose, ariaLabelledBy } = props;

  const wrapperStyles = css`
    display: flex;
    flex-direction: column;
    height: 100%;
    ${conversationBackgroundStyles(euiTheme)}
  `;

  const headerStyles = css`
    display: flex;
    height: ${headerHeight}px;
    &.euiFlyoutHeader {
      padding-inline: 0;
      padding-block-start: 0;
      padding: ${euiTheme.size.base};
    }
  `;

  return (
    <div css={wrapperStyles} data-test-subj="agentBuilderConversation">
      <EmbeddableConversationsProvider {...props}>
        <EmbeddableAccessBoundary onClose={onClose}>
          <EuiFlyoutHeader css={headerStyles}>
            <EmbeddableConversationHeader onClose={onClose} ariaLabelledBy={ariaLabelledBy} />
          </EuiFlyoutHeader>
          <EmbeddableWelcomeMessage />
          <TemplateAwareBody />
        </EmbeddableAccessBoundary>
      </EmbeddableConversationsProvider>
    </div>
  );
};
