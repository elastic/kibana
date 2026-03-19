/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { i18n } from '@kbn/i18n';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { appPaths } from '../../../../../utils/app_paths';
import { getAgentIdFromPath, getConversationIdFromPath } from '../../../../../route_config';
import { useNavigation } from '../../../../../hooks/use_navigation';
import { useValidateAgentId } from '../../../../../hooks/agents/use_validate_agent_id';
import { useAgentBuilderAgents } from '../../../../../hooks/agents/use_agents';
import { useLastAgentId } from '../../../../../hooks/use_last_agent_id';

import { ConversationFooter } from './conversation_footer';
import { ConversationList } from './conversation_list';
import { SidebarLink } from './sidebar_link';

const customizeLabel = i18n.translate('xpack.agentBuilder.sidebar.conversation.customize', {
  defaultMessage: 'Customize',
});

const newChatLabel = i18n.translate('xpack.agentBuilder.sidebar.conversation.newChat', {
  defaultMessage: 'New chat',
});

const recentChatsLabel = i18n.translate('xpack.agentBuilder.sidebar.conversation.recentChats', {
  defaultMessage: 'Recent chats',
});

export const ConversationSidebarView: React.FC = () => {
  const { pathname } = useLocation();
  const agentId = getAgentIdFromPath(pathname) ?? agentBuilderDefaultAgentId;
  const conversationId = getConversationIdFromPath(pathname);
  const { euiTheme } = useEuiTheme();
  const { navigateToAgentBuilderUrl } = useNavigation();
  const validateAgentId = useValidateAgentId();
  const { isFetched: isAgentsFetched } = useAgentBuilderAgents();
  const lastAgentId = useLastAgentId();

  const containerStyles = css`
    display: flex;
    gap: ${euiTheme.size.base};
    flex-direction: column;
    height: 100%;
    width: 100%;
  `;

  const listStyles = css`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 0 ${euiTheme.size.base};
  `;

  useEffect(() => {
    // Once agents have loaded, redirect to the last valid agent if the current agent ID
    // is not recognised — but only when there is no conversation ID in the URL (new
    // conversation route). Existing conversations for a deleted agent are intentionally
    // shown read-only with the input disabled.

    // We also check that lastAgentId itself is valid before redirecting: if local storage
    // holds a stale/invalid ID too, navigating to it would trigger this effect again and
    // cause an infinite redirect loop.
    if (
      isAgentsFetched &&
      !conversationId &&
      !validateAgentId(agentId) &&
      validateAgentId(lastAgentId)
    ) {
      navigateToAgentBuilderUrl(appPaths.agent.root({ agentId: lastAgentId }));
    }
  }, [
    isAgentsFetched,
    conversationId,
    agentId,
    lastAgentId,
    validateAgentId,
    navigateToAgentBuilderUrl,
  ]);

  const CustomizeLink = () => (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      css={css`
        flex-grow: 0;
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiHorizontalRule margin="none" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <SidebarLink
          label={customizeLabel}
          href={appPaths.agent.overview({ agentId })}
          onClick={(e) => {
            e.preventDefault();
            navigateToAgentBuilderUrl(appPaths.agent.overview({ agentId }));
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiHorizontalRule margin="none" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const newChatBarStyles = css`
    flex-grow: 0;
    padding: 0 ${euiTheme.size.base};
  `;

  return (
    <div css={containerStyles}>
      <CustomizeLink />
      <EuiFlexGroup gutterSize="s" responsive={false} css={newChatBarStyles}>
        <EuiFlexItem grow>
          <EuiButton
            iconType="plus"
            size="s"
            fullWidth
            color="text"
            onClick={() => navigateToAgentBuilderUrl(appPaths.agent.conversations.new({ agentId }))}
          >
            {newChatLabel}
          </EuiButton>
        </EuiFlexItem>
        {/* <EuiFlexItem grow={false}>
          <EuiButtonIcon
            color="text"
            iconType="search"
            size="s"
            display="base"
            aria-label={searchConversationsLabel}
            onClick={() => {}}
          />
        </EuiFlexItem> */}
      </EuiFlexGroup>
      <EuiFlexItem
        grow={false}
        css={css`
          padding: 0px ${euiTheme.size.l};
          font-weight: ${euiTheme.font.weight.medium};
          color: ${euiTheme.colors.textDisabled};
        `}
      >
        <EuiText size="xs" color="text">
          {recentChatsLabel}
        </EuiText>
      </EuiFlexItem>
      <div css={listStyles}>
        <ConversationList agentId={agentId} currentConversationId={conversationId} />
      </div>
      <ConversationFooter />
    </div>
  );
};
