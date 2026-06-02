/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Conversation } from './conversation';
import { ConversationDetailShell } from './detail/conversation_detail_shell';
import { shouldShowTemplateDetailShell } from './detail/template_conversation_utils';
import { RoutedConversationsProvider } from '../../context/conversation/routed_conversations_provider';
import {
  SendMessageProvider,
  useSendMessage,
} from '../../context/send_message/send_message_context';
import { conversationBackgroundStyles, headerHeight } from './conversation.styles';
import { ConversationHeader } from './conversation_header/conversation_header';
import { useConversation, useConversationId, useHasPersistedConversation } from '../../hooks/use_conversation';

const LocationErrorClearer: React.FC<{}> = () => {
  const { key: locationKey } = useLocation();
  const { removeError } = useSendMessage();
  useEffect(() => {
    removeError();
  }, [locationKey, removeError]);
  return null;
};

const ConversationPageContent: React.FC<{}> = () => {
  const { euiTheme } = useEuiTheme();
  const conversationId = useConversationId();
  const hasPersistedConversation = useHasPersistedConversation();
  const { conversation, isLoading, isFetched } = useConversation();

  const showTemplateDetailShell =
    hasPersistedConversation &&
    Boolean(conversationId) &&
    (isLoading || shouldShowTemplateDetailShell(conversation));

  const containerStyles = css`
    display: flex;
    flex-direction: column;
    height: var(--kbn-application--content-height);
    ${conversationBackgroundStyles(euiTheme)}
  `;

  const headerStyles = css`
    flex-shrink: 0;
    height: ${headerHeight}px;
    display: flex;
    align-items: center;
    padding: ${euiTheme.size.m};
  `;

  const contentStyles = css`
    width: 100%;
    flex: 1;
    max-block-size: calc(var(--kbn-application--content-height) - ${headerHeight}px);
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0 ${euiTheme.size.base} ${euiTheme.size.base} ${euiTheme.size.base};
  `;

  const templateDetailContentStyles = css`
    width: 100%;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  `;

  if (showTemplateDetailShell) {
    return (
      <div css={containerStyles} data-test-subj="agentBuilderPageConversations">
        <div css={templateDetailContentStyles}>
          {isFetched || conversation ? (
            <ConversationDetailShell />
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div css={containerStyles} data-test-subj="agentBuilderPageConversations">
      <div css={headerStyles}>
        <ConversationHeader />
      </div>
      <div css={contentStyles}>
        <Conversation />
      </div>
    </div>
  );
};

export const AgentBuilderConversationsView: React.FC<{}> = () => {
  return (
    <RoutedConversationsProvider>
      <SendMessageProvider>
        <LocationErrorClearer />
        <ConversationPageContent />
      </SendMessageProvider>
    </RoutedConversationsProvider>
  );
};
