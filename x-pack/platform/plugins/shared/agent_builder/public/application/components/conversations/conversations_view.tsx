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
import { conversationBackgroundStyles, headerHeight } from './conversation.styles';
import { ConversationHeader } from './conversation_header/conversation_header';
import { useConversationId } from '../../context/conversation/use_conversation_id';
import { useConversation, useHasPersistedConversation } from '../../hooks/use_conversation';
import { useConversationStream } from '../../hooks/use_conversation_stream';

const LocationErrorClearer: React.FC<{}> = () => {
  const { key: locationKey } = useLocation();
  const { removeError } = useConversationStream();
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
          {isFetched || conversation ? <ConversationDetailShell /> : null}
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
      <LocationErrorClearer />
      <ConversationPageContent />
    </RoutedConversationsProvider>
  );
};
