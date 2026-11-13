/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { Conversation } from './conversation';
import { ConversationAppHeader } from './conversation_header/conversation_app_header';
import { RoutedConversationsProvider } from '../../context/conversation/routed_conversations_provider';
import { conversationBackgroundStyles } from './conversation.styles';

export const AgentBuilderConversationsView: React.FC<{}> = () => {
  const { euiTheme } = useEuiTheme();

  const containerStyles = css`
    display: flex;
    flex-direction: column;
    height: var(--kbn-application--content-height);
    ${conversationBackgroundStyles(euiTheme)}
  `;

  const contentStyles = css`
    width: 100%;
    flex: 1;
    min-block-size: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0 ${euiTheme.size.base} ${euiTheme.size.base} ${euiTheme.size.base};
  `;

  return (
    <RoutedConversationsProvider>
      <div css={containerStyles} data-test-subj="agentBuilderPageConversations">
        <ConversationAppHeader />
        <div css={contentStyles}>
          <Conversation />
        </div>
      </div>
    </RoutedConversationsProvider>
  );
};
