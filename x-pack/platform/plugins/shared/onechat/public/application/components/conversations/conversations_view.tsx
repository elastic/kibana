/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React from 'react';
import { useNavigation } from '../../hooks/use_navigation';
import { appPaths } from '../../utils/app_paths';
import { Conversation } from './conversation';
import { ConversationHeader } from './conversation_header';
import { ConversationPanel } from './conversation_panel/conversation_panel';

export const OnechatConversationsView: React.FC<{ conversationId?: string }> = ({
  conversationId,
}) => {
  const { navigateToOnechatUrl } = useNavigation();

  const { euiTheme } = useEuiTheme();

  const pageSectionContentClassName = css`
    width: 100%;
    display: flex;
    flex-grow: 1;
    padding-top: 0;
    padding-bottom: 0;
    height: 100%;
    max-block-size: var(--kbn-application--content-height);
    background-color: ${euiTheme.colors.backgroundBasePlain};
  `;

  return (
    <KibanaPageTemplate
      offset={0}
      restrictWidth={false}
      data-test-subj="onechatPageConversations"
      grow={false}
      panelled={false}
    >
      <KibanaPageTemplate.Sidebar paddingSize="none" minWidth={280}>
        <ConversationPanel
          onNewConversationSelect={() => {
            navigateToOnechatUrl(appPaths.chat.new);
          }}
        />
      </KibanaPageTemplate.Sidebar>

      <KibanaPageTemplate.Section paddingSize="none" grow contentProps={{ css: 'height: 100%' }}>
        <EuiFlexGroup
          className={pageSectionContentClassName}
          direction="column"
          gutterSize="none"
          justifyContent="center"
          responsive={false}
        >
          <ConversationHeader conversationId={conversationId} />
          <Conversation conversationId={conversationId} />
        </EuiFlexGroup>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
