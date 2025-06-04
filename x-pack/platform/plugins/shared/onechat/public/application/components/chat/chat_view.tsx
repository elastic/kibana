/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiFlexGroup, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { OneChatDefaultAgentId } from '@kbn/onechat-common';
import { useNavigation } from '../../hooks/use_navigation';
// import { ConversationPanel } from './conversations_panel/conversation_panel';
import { appPaths } from '../../utils/app_paths';
import { ChatHeader } from './header_bar/chat_header';
import { ConversationEventChanges } from '../../../../common/chat_events';
import { Chat } from './chat';

export const OnechatChatView: React.FC<{ conversationId?: string }> = ({ conversationId }) => {
  const { navigateToOnechatUrl } = useNavigation();

  const { euiTheme } = useEuiTheme();

  const pageSectionContentClassName = css`
    width: 100%;
    display: flex;
    flex-grow: 1;
    padding-top: 0;
    padding-bottom: 0;
    height: 100%;
    max-block-size: calc(100vh - var(--kbnAppHeadersOffset, var(--euiFixedHeadersOffset, 0)));
    background-color: ${euiTheme.colors.backgroundBasePlain};
  `;

  // const currentUser = useCurrentUser();
  // const { conversations, refresh: refreshConversations } = useConversationList({ agentId });

  const onConversationUpdate = useCallback(
    (changes: ConversationEventChanges) => {
      if (!conversationId) {
        navigateToOnechatUrl(appPaths.chat.conversation({ conversationId: changes.id }));
      }
      // refreshConversations();
    },
    [navigateToOnechatUrl, conversationId]
  );

  const [connectorId, setConnectorId] = useState<string>();

  return (
    <KibanaPageTemplate
      offset={0}
      restrictWidth={false}
      data-test-subj="onechatPageChat"
      grow={false}
      panelled={false}
    >
      {/* <KibanaPageTemplate.Sidebar paddingSize="none" minWidth={280}>
        <ConversationPanel
          agentId={}
          conversations={conversations}
          activeConversationId={conversationId}
          onConversationSelect={(newConvId) => {
            navigateToOnechatUrl(
              appPaths.chat.conversation({ agentId, conversationId: newConvId })
            );
          }}
          onNewConversationSelect={() => {
            navigateToOnechatUrl(appPaths.chat.new({ agentId }));
          }}
        />
      </KibanaPageTemplate.Sidebar> */}

      <KibanaPageTemplate.Section paddingSize="none" grow contentProps={{ css: 'height: 100%' }}>
        <EuiFlexGroup
          className={pageSectionContentClassName}
          direction="column"
          gutterSize="none"
          justifyContent="center"
          responsive={false}
        >
          <ChatHeader
            connectorId={connectorId}
            conversationId={conversationId}
            onConnectorChange={setConnectorId}
          />
          <Chat
            agentId={OneChatDefaultAgentId}
            conversationId={conversationId}
            connectorId={connectorId}
            onConversationUpdate={onConversationUpdate}
          />
        </EuiFlexGroup>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
