/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React from 'react';
import { Conversation } from './conversation';
import { ConversationHeader } from './conversation_header/conversation_header';
import { AgentBuilderTourProvider } from '../../context/agent_builder_tour_context';
import { RoutedConversationsProvider } from '../../context/conversation/routed_conversations_provider';
import { SendMessageProvider } from '../../context/send_message/send_message_context';
import {
  AttachmentPanelProvider,
  useAttachmentPanel,
} from '../../context/attachment_panel/attachment_panel_context';
import { conversationBackgroundStyles, headerHeight } from './conversation.styles';
import { AttachmentPanel } from './attachment_panel/attachment_panel';

/**
 * Inner component that manages the split-screen layout with AttachmentPanel.
 * Must be rendered inside AttachmentPanelProvider.
 */
const ConversationWithAttachmentPanel: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { isPanelOpen, closePanel, attachmentId } = useAttachmentPanel();

  const splitContainerStyles = css`
    width: 100%;
    height: 100%;
    display: flex;
  `;

  const conversationPanelStyles = css`
    height: 100%;
    width: ${isPanelOpen ? '50%' : '100%'};
    transition: width 0.2s ease-out;
    display: flex;
    align-items: center;
  `;

  const attachmentPanelStyles = css`
    height: 100%;
    width: 50%;
    border: 3px solid red;
  `;

  return (
    <EuiFlexGroup css={splitContainerStyles} responsive={false}>
      {isPanelOpen && (
        <EuiFlexItem css={attachmentPanelStyles} grow={false}>
          <AttachmentPanel onClose={closePanel} attachmentId={attachmentId} />
        </EuiFlexItem>
      )}
      <EuiFlexItem css={conversationPanelStyles} grow={false}>
        <Conversation />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

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
      <AttachmentPanelProvider>
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
                <ConversationWithAttachmentPanel />
              </KibanaPageTemplate.Section>
            </KibanaPageTemplate>
          </AgentBuilderTourProvider>
        </SendMessageProvider>
      </AttachmentPanelProvider>
    </RoutedConversationsProvider>
  );
};
