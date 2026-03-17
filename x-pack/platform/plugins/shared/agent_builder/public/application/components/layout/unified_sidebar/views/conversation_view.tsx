/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { Link } from 'react-router-dom-v5-compat';
import { useLocation } from 'react-router-dom';

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiHorizontalRule, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import { appPaths } from '../../../../utils/app_paths';
import { getAgentIdFromPath, getConversationIdFromPath } from '../../../../route_config';
import { AgentSelector } from '../agent_selector';
import { SidebarConversationList } from './sidebar_conversation_list';

const labels = {
  customize: i18n.translate('xpack.agentBuilder.sidebar.conversation.customize', {
    defaultMessage: 'Customize',
  }),
  manageComponents: i18n.translate('xpack.agentBuilder.sidebar.conversation.manageComponents', {
    defaultMessage: 'Manage components',
  }),
  recentChats: i18n.translate('xpack.agentBuilder.sidebar.conversation.recentChats', {
    defaultMessage: 'Recent chats',
  }),
};

// TODO: fix these values once the UI is complete for the header and footer or use a resizeObserver to get the height of the header and footer which is more dynamic
const HEADER_HEIGHT = 120; // Agent selector (~56px) + Customize link (~18px) + hr margin (~16px)
const FOOTER_HEIGHT = 50; // hr margin (~16px) + Manage link (~18px) + padding

const containerStyles = css`
  position: relative;
  height: 100%;
  width: 100%;
`;

const linkStyles = css`
  text-decoration: none;
  color: inherit;
  &:hover {
    text-decoration: underline;
  }
`;

export const ConversationSidebarView: React.FC = () => {
  const { pathname } = useLocation();
  const agentId = getAgentIdFromPath(pathname) ?? 'elastic-ai-agent';
  const conversationId = getConversationIdFromPath(pathname);
  const { euiTheme } = useEuiTheme();

  const headerStyles = css`
    padding: ${euiTheme.size.base};
  `;
  const scrollableStyles = css`
    position: absolute;
    top: ${HEADER_HEIGHT}px;
    bottom: ${FOOTER_HEIGHT}px;
    padding: ${euiTheme.size.base};
    left: 0;
    right: 0;
    overflow-y: auto;
  `;

  const footerStyles = css`
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: ${euiTheme.size.base};
  `;

  const recentChatsStyles = css`
    padding: 0 ${euiTheme.size.s};
    font-weight: ${euiTheme.font.weight.semiBold};
  `;

  const getNavigationPath = useCallback(
    (newAgentId: string) => appPaths.agent.root({ agentId: newAgentId }),
    []
  );

  return (
    <div css={containerStyles}>
      {/* Header */}
      <EuiFlexGroup direction="column" gutterSize="s" css={headerStyles}>
        <EuiFlexItem grow={false}>
          <AgentSelector agentId={agentId} getNavigationPath={getNavigationPath} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <Link to={appPaths.agent.instructions({ agentId })} css={linkStyles}>
            <EuiText size="s">{labels.customize}</EuiText>
          </Link>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiHorizontalRule margin="none" />
        </EuiFlexItem>
      </EuiFlexGroup>

      {/* Scrollable conversation list */}
      <div css={scrollableStyles}>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem grow={false} css={recentChatsStyles}>
            <EuiText size="xs" color="disabled" css={{ fontWeight: euiTheme.font.weight.semiBold }}>
              {labels.recentChats}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SidebarConversationList agentId={agentId} currentConversationId={conversationId} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>

      {/* Footer */}
      <div css={footerStyles}>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiHorizontalRule margin="none" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <Link to={appPaths.manage.agents} css={linkStyles}>
              <EuiText size="s">{labels.manageComponents}</EuiText>
            </Link>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </div>
  );
};
