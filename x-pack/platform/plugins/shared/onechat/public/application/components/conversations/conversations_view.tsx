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
import { RoutedConversationsProvider } from '../../context/conversation/routed_conversations_provider';
import { SendMessageProvider } from '../../context/send_message/send_message_context';

export const OnechatConversationsView: React.FC<{}> = () => {
  const { euiTheme } = useEuiTheme();

  const mainStyles = css`
    border: none;
  `;
  const backgroundStyles = css`
    background-color: ${euiTheme.colors.backgroundBasePlain};
  `;
  const headerHeight = `calc(${euiTheme.size.xl} * 2)`;
  const headerStyles = css`
    ${backgroundStyles}
    justify-content: center;
    block-size: ${headerHeight};
  `;
  const contentStyles = css`
    ${backgroundStyles}
    width: 100%;
    height: 100%;
    max-block-size: calc(var(--kbn-application--content-height) - ${headerHeight});
    display: flex;
    justify-content: center;
    align-items: center;
  `;

  const labels = {
    header: i18n.translate('xpack.onechat.conversationsView.header', {
      defaultMessage: 'Conversation header',
    }),
    content: i18n.translate('xpack.onechat.conversationsView.content', {
      defaultMessage: 'Conversation content',
    }),
  };

  return (
    <RoutedConversationsProvider>
      <SendMessageProvider>
        <KibanaPageTemplate
          offset={0}
          restrictWidth={false}
          data-test-subj="onechatPageConversations"
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
      </SendMessageProvider>
    </RoutedConversationsProvider>
  );
};
