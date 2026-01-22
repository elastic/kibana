/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React from 'react';
import { Conversation } from './conversation';
import { ConversationHeader } from './conversation_header/conversation_header';
import { AgentBuilderTourProvider } from '../../context/agent_builder_tour_context';
import { RoutedConversationsProvider } from '../../context/conversation/routed_conversations_provider';
import { SendMessageProvider } from '../../context/send_message/send_message_context';
import { conversationBackgroundStyles, headerHeight } from './conversation.styles';

export const AgentBuilderConversationsView: React.FC<{}> = () => {
  const { euiTheme } = useEuiTheme();

  const mainStyles = css`
    border: none;
    ${conversationBackgroundStyles(euiTheme)}
  `;
  const headerStyles = css`
    justify-content: center;
    height: ${headerHeight}px;
  `;
  const contentStyles = css`
    width: 100%;
    height: 100%;
    max-block-size: calc(var(--kbn-application--content-height) - ${headerHeight}px);
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0 ${euiTheme.size.base} ${euiTheme.size.base} ${euiTheme.size.base};
  `;

  const labels = {
    header: i18n.translate('xpack.agentBuilder.conversationsView.header', {
      defaultMessage: 'Conversation header',
    }),
    content: i18n.translate('xpack.agentBuilder.conversationsView.content', {
      defaultMessage: 'Conversation content',
    }),
  };

  return (
    <RoutedConversationsProvider>
      <SendMessageProvider>
        <AgentBuilderTourProvider>
          <KibanaPageTemplate
            offset={0}
            restrictWidth={false}
            data-test-subj="agentBuilderPageConversations"
            grow={false}
            panelled={false}
            mainProps={{
              css: mainStyles,
            }}
            responsive={[]}
          >
            <KibanaPageTemplate.Header
              css={headerStyles}
              bottomBorder={false}
              aria-label={labels.header}
              paddingSize="m"
              responsive={false}
            >
              <ConversationHeader />
            </KibanaPageTemplate.Header>
            <KibanaPageTemplate.Section
              paddingSize="none"
              grow
              contentProps={{
                css: contentStyles,
              }}
              aria-label={labels.content}
            >
              <Conversation />
            </KibanaPageTemplate.Section>
          </KibanaPageTemplate>
        </AgentBuilderTourProvider>
      </SendMessageProvider>
    </RoutedConversationsProvider>
  );
};
