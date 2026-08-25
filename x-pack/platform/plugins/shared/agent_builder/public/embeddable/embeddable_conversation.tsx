/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlyoutBody, EuiFlyoutHeader, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
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

/**
 * Renders the body section of the sidebar. When the conversation's template has registered
 * UI tabs, shows a side-by-side layout: chat on the left, the first tab's content on the
 * right. When there are no tabs, renders only the chat (original behaviour).
 * Must live inside EmbeddableConversationsProvider so it can read conversation + services.
 */
function TemplateAwareBody(): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const { conversationTemplatesService } = useAgentBuilderServices();
  const { conversation } = useConversation();

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

  if (!hasTabs) {
    return (
      <EuiFlyoutBody css={bodyStyles}>
        <Conversation />
      </EuiFlyoutBody>
    );
  }

  const FirstTabContent = resolvedTabs[0].def.content;

  return (
    <div
      css={css`
        display: flex;
        flex-direction: row;
        flex: 1;
        min-height: 0;
        overflow: hidden;
      `}
    >
      <div
        css={css`
          flex: 3;
          min-width: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        `}
      >
        <EuiFlyoutBody css={bodyStyles}>
          <Conversation />
        </EuiFlyoutBody>
      </div>
      <div
        css={css`
          flex: 2;
          min-width: 0;
          overflow-y: auto;
          border-left: 1px solid ${euiTheme.border.color};
          padding: ${euiTheme.size.base};
        `}
      >
        {conversation && <FirstTabContent conversation={conversation} />}
      </div>
    </div>
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
