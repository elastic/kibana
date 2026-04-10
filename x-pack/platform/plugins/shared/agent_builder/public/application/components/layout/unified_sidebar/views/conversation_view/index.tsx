/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/react';

import { i18n } from '@kbn/i18n';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { appPaths } from '../../../../../utils/app_paths';
import { newConversationId } from '../../../../../utils/new_conversation';
import {
  getAgentIdFromPath,
  getAgentSettingsNavItems,
  getConversationIdFromPath,
} from '../../../../../route_config';
import { useFeatureFlags } from '../../../../../hooks/use_feature_flags';
import { useNavigation } from '../../../../../hooks/use_navigation';
import { useValidateAgentId } from '../../../../../hooks/agents/use_validate_agent_id';
import { useAgentBuilderAgents } from '../../../../../hooks/agents/use_agents';
import { useLastAgentId } from '../../../../../hooks/use_last_agent_id';
import { useConversationList } from '../../../../../hooks/use_conversation_list';
import { SidebarNavList } from '../../shared/sidebar_nav_list';

import { ConversationFooter } from './conversation_footer';
import { ConversationList } from './conversation_list';
import { ConversationSearchModal } from '../../../../conversations/conversation_search_modal';

const customizeLabel = i18n.translate('xpack.agentBuilder.sidebar.conversation.customize', {
  defaultMessage: 'Customize',
});

const newLabel = i18n.translate('xpack.agentBuilder.sidebar.conversation.new', {
  defaultMessage: 'New',
});

const searchLabel = i18n.translate('xpack.agentBuilder.sidebar.conversation.search', {
  defaultMessage: 'Search',
});

const searchChatsAriaLabel = i18n.translate('xpack.agentBuilder.sidebar.conversation.searchChats', {
  defaultMessage: 'Search chats',
});

const chatsLabel = i18n.translate('xpack.agentBuilder.sidebar.conversation.chats', {
  defaultMessage: 'Chats',
});

const containerStyles = css`
  display: flex;
  gap: 0;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
`;

const flexColumnStyles = css`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const conversationListScrollStyles = css`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
`;

const sectionLabelStyles = (euiTheme: EuiThemeComputed) => css`
  padding: ${euiTheme.size.xs} ${euiTheme.size.s};
`;

export const ConversationSidebarView: React.FC = () => {
  const { pathname } = useLocation();
  const agentId = getAgentIdFromPath(pathname) ?? agentBuilderDefaultAgentId;
  const conversationId = getConversationIdFromPath(pathname);
  const { euiTheme } = useEuiTheme();
  const { navigateToAgentBuilderUrl } = useNavigation();
  const validateAgentId = useValidateAgentId();
  const { isFetched: isAgentsFetched } = useAgentBuilderAgents();
  const lastAgentId = useLastAgentId();
  const featureFlags = useFeatureFlags();

  const { conversations = [] } = useConversationList({ agentId });
  const hasConversations = conversations.length > 0;

  const isNewConversationRoute =
    conversationId === newConversationId || pathname === appPaths.agent.root({ agentId });

  const navItems = useMemo(
    () => getAgentSettingsNavItems(agentId, featureFlags),
    [agentId, featureFlags]
  );

  const isActive = (path: string) => pathname === path;

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

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

  const handlePressNewConversation = () => {
    navigateToAgentBuilderUrl(appPaths.agent.conversations.new({ agentId }));
  };

  return (
    <div css={containerStyles} data-test-subj="agentBuilderSidebar-conversation">
      <EuiHorizontalRule margin="none" />

      <div css={flexColumnStyles}>
        <div
          css={[
            flexColumnStyles,
            css`
              padding: ${euiTheme.size.base};
            `,
          ]}
        >
          <div
            css={css`
              flex-shrink: 0;
            `}
          >
            <EuiText size="xs" color="subdued" css={sectionLabelStyles(euiTheme)}>
              {customizeLabel}
            </EuiText>
            <EuiSpacer size="xs" />
            <SidebarNavList items={navItems} isActive={isActive} />
          </div>

          <EuiSpacer size="l" />

          <div css={flexColumnStyles}>
            <EuiText size="xs" color="subdued" css={sectionLabelStyles(euiTheme)}>
              {chatsLabel}
            </EuiText>
            <EuiSpacer size="s" />
            {/* EuiFlexGroup defaults to flex-grow: 1 as a flex item; wrapper keeps list scroll area height */}
            <div
              css={css`
                flex: 0 0 auto;
                width: 100%;
              `}
            >
              <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="flexStart">
                <EuiFlexItem grow={true}>
                  <EuiButton
                    fullWidth
                    iconType="plus"
                    size="s"
                    color="text"
                    onClick={handlePressNewConversation}
                    data-test-subj="agentBuilderSidebarNewConversationButton"
                  >
                    {newLabel}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={true}>
                  <EuiButton
                    fullWidth
                    iconType="search"
                    size="s"
                    color="text"
                    aria-label={searchChatsAriaLabel}
                    onClick={() => setIsSearchModalOpen(true)}
                    disabled={!hasConversations}
                    data-test-subj="agentBuilderSidebarSearchChatsButton"
                  >
                    {searchLabel}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
            <EuiSpacer size="m" />
            <div css={conversationListScrollStyles}>
              <ConversationList
                agentId={agentId}
                currentConversationId={conversationId}
                isNewConversationRoute={isNewConversationRoute}
              />
            </div>
          </div>
        </div>

        <ConversationFooter />
      </div>

      {isSearchModalOpen && (
        <ConversationSearchModal
          agentId={agentId}
          currentConversationId={conversationId}
          onClose={() => setIsSearchModalOpen(false)}
          onSelectConversation={(id) => {
            navigateToAgentBuilderUrl(
              appPaths.agent.conversations.byId({ agentId, conversationId: id })
            );
            setIsSearchModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
