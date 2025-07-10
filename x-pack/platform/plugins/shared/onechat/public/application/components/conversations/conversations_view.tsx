/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React, { useState } from 'react';
import { Conversation } from './conversation';
import { ConversationActions } from './conversation_actions';
import { ConversationGrid } from './conversation_grid';
import { ConversationSidebar } from './conversation_sidebar';
import { ConversationSidebarToggle } from './conversation_sidebar_toggle';
import { ConversationTitle } from './conversation_title';
import { conversationsCommonLabels } from './i18n';

export const OnechatConversationsView: React.FC<{}> = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { euiTheme } = useEuiTheme();

  const backgroundStyles = css`
    background-color: ${euiTheme.colors.backgroundBasePlain};
  `;
  const headerHeight = `calc(${euiTheme.size.xxl} * 2)`;
  const headerStyles = css`
    ${backgroundStyles}
    display: flex;
    justify-content: center;
    border: none;
    max-block-size: ${headerHeight};
  `;
  const mainContentStyles = css`
    ${backgroundStyles}
    width: 100%;
    height: 100%;
    max-block-size: calc(var(--kbn-application--content-height) - ${headerHeight});
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

      <KibanaPageTemplate.Header
        css={headerStyles}
        bottomBorder={false}
        aria-label={conversationsCommonLabels.header.ariaLabel}
      >
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
      <KibanaPageTemplate.Section
        paddingSize="none"
        grow
        contentProps={{
          css: mainContentStyles,
        }}
        aria-label={conversationsCommonLabels.content.ariaLabel}
      >
        <Conversation />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
