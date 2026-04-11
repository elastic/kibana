/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';

import {
  EuiAccordion,
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { i18n } from '@kbn/i18n';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { appPaths } from '../../../../../utils/app_paths';
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

const chatsAccordionStyles = css`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .euiAccordion__childWrapper {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .euiAccordion__children {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
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

  const hasSetCustomiseAccordionFirstTime = useRef(false);

  const { conversations = [] } = useConversationList({ agentId });
  const hasConversations = conversations.length > 0;

  const navItems = useMemo(
    () => getAgentSettingsNavItems(agentId, featureFlags),
    [agentId, featureFlags]
  );

  const isActive = (path: string) => pathname === path;

  const isAnyNavItemActive = navItems.some((item) => isActive(item.path));

  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [isChatsOpen, setIsChatsOpen] = useState(true);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // When the user refreshes on an agent settings route, ensure the Customize accordion is open
  useEffect(() => {
    if (isAnyNavItemActive && !isCustomizeOpen && !hasSetCustomiseAccordionFirstTime.current) {
      setIsCustomizeOpen(true);
      setIsChatsOpen(false);
      hasSetCustomiseAccordionFirstTime.current = true;
    }
  }, [isAnyNavItemActive, isCustomizeOpen]);

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

  const accordionButtonStyles = css`
    padding: ${euiTheme.size.s} ${euiTheme.size.base};

    .euiAccordion__triggerWrapper {
      padding: 0;
    }

    .euiAccordion__iconButton {
      color: ${euiTheme.colors.textParagraph};
    }
  `;

  const buttonStyles = css`
    color: ${euiTheme.colors.textSubdued};
    font-weight: ${euiTheme.font.weight.semiBold};
  `;

  const conversationListStyles = css`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  `;

  return (
    <div css={containerStyles} data-test-subj="agentBuilderSidebar-conversation">
      <EuiHorizontalRule margin="none" />
      <EuiSpacer size="s" />

      {/* Customize accordion - with agent settings nav items */}
      <EuiAccordion
        id="sidebar-customize"
        buttonContent={
          <EuiText css={buttonStyles} size="s">
            {customizeLabel}
          </EuiText>
        }
        arrowDisplay="left"
        forceState={isCustomizeOpen ? 'open' : 'closed'}
        onToggle={() => setIsCustomizeOpen((prev) => !prev)}
        paddingSize="none"
        css={accordionButtonStyles}
      >
        <div
          css={css`
            padding: ${euiTheme.size.s} 0;
          `}
        >
          <SidebarNavList
            items={navItems}
            isActive={isActive}
            onItemClick={() => setIsChatsOpen(false)}
          />
        </div>
      </EuiAccordion>

      {/* Chats accordion - with conversation list */}
      <EuiAccordion
        id="sidebar-chats"
        buttonContent={
          <EuiText css={buttonStyles} size="s">
            {chatsLabel}
          </EuiText>
        }
        extraAction={
          <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButton
                iconType="plus"
                size="s"
                color="text"
                onClick={() =>
                  navigateToAgentBuilderUrl(appPaths.agent.conversations.new({ agentId }))
                }
                data-test-subj="agentBuilderSidebarNewConversationButton"
              >
                {newLabel}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                display="base"
                iconType="search"
                size="s"
                color="text"
                aria-label={searchChatsAriaLabel}
                onClick={() => setIsSearchModalOpen(true)}
                disabled={!hasConversations}
                data-test-subj="agentBuilderSidebarSearchChatsButton"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        arrowDisplay="left"
        forceState={isChatsOpen ? 'open' : 'closed'}
        onToggle={() => setIsChatsOpen((prev) => !prev)}
        buttonProps={{ 'data-test-subj': 'agentBuilderSidebarChatsToggle' }}
        paddingSize="none"
        css={[accordionButtonStyles, chatsAccordionStyles]}
      >
        <div css={conversationListStyles}>
          <EuiSpacer size="m" />
          <ConversationList
            agentId={agentId}
            currentConversationId={conversationId}
            onItemClick={() => setIsCustomizeOpen(false)}
          />
        </div>
      </EuiAccordion>

      <ConversationFooter />

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
