/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { oneChatDefaultAgentId } from '@kbn/onechat-common';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React, { useState } from 'react';
import { useConversation } from '../../hooks/use_conversation';
import { Conversation } from './conversation';
import { ConversationActions } from './conversation_actions';
import { ConversationGrid } from './conversation_grid';
import { ConversationSidebar } from './conversation_sidebar';
import { ConversationSidebarToggle } from './conversation_sidebar_toggle';
import { ConversationTitle } from './conversation_title';

export const OnechatConversationsView: React.FC<{}> = () => {
  const { conversation } = useConversation();
  const hasActiveConversation = Boolean(conversation);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { euiTheme } = useEuiTheme();

  const backgroundStyles = css`
    background-color: ${euiTheme.colors.backgroundBasePlain};
  `;
  const fullSizeStyles = css`
    width: 100%;
    height: 100%;
  `;

  const headerHeight = `calc(${euiTheme.size.xxl} * 2)`;
  const headerStyles = css`
    display: flex;
    justify-content: center;
    align-items: stretch;
    position: relative;
    border: none;
    max-block-size: ${headerHeight};
    ${backgroundStyles}
  `;
  const mainContentStyles = css`
    ${fullSizeStyles}
    ${backgroundStyles}
    display: flex;
    flex-direction: column;
    align-items: center;
  `;
  const conversationContainerStyles = css`
    ${fullSizeStyles}
    max-block-size: calc(
      100vh - var(--kbnAppHeadersOffset, var(--euiFixedHeadersOffset, 0)) - ${headerHeight}
    );
  `;

  return (
    <KibanaPageTemplate
      offset={0}
      restrictWidth={false}
      data-test-subj="onechatPageConversations"
      grow={false}
      panelled={false}
    >
      {isSidebarOpen && (
        <KibanaPageTemplate.Sidebar data-test-subj="onechatSidebar">
          <ConversationSidebar />
        </KibanaPageTemplate.Sidebar>
      )}

      {hasActiveConversation && (
        <KibanaPageTemplate.Header css={headerStyles} bottomBorder={false}>
          <ConversationGrid>
            <ConversationSidebarToggle
              isSidebarOpen={isSidebarOpen}
              onToggle={() => {
                setIsSidebarOpen((open) => !open);
              }}
            />
            <ConversationTitle />
            <ConversationActions />
          </ConversationGrid>
        </KibanaPageTemplate.Header>
      )}
      <KibanaPageTemplate.Section
        paddingSize="none"
        grow
        contentProps={{
          css: mainContentStyles,
        }}
      >
        <EuiFlexGroup
          css={conversationContainerStyles}
          direction="column"
          gutterSize="l"
          justifyContent="center"
          responsive={false}
        >
          <Conversation agentId={oneChatDefaultAgentId} />
        </EuiFlexGroup>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
