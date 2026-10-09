/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { useLocation } from 'react-router-dom';
import type { DragStart, DragUpdate, DropResult } from '@hello-pangea/dnd';

import {
  EuiButton,
  EuiDragDropContext,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { i18n } from '@kbn/i18n';
import {
  agentBuilderDefaultAgentId,
  AGENT_BUILDER_EVENT_TYPES,
  AGENT_BUILDER_UI_EBT,
} from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import { appPaths } from '../../../../../utils/app_paths';
import {
  getAgentIdFromPath,
  getAgentSettingsNavItems,
  getConversationIdFromPath,
} from '../../../../../route_config';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useRouteAccessConfig } from '../../../../../hooks/use_route_access_config';
import { useNavigation } from '../../../../../hooks/use_navigation';
import { useValidateAgentId } from '../../../../../hooks/agents/use_validate_agent_id';
import { useAgentBuilderAgents } from '../../../../../hooks/agents/use_agents';
import { useLastAgentId } from '../../../../../hooks/use_last_agent_id';
import { useConversationList } from '../../../../../hooks/use_conversation_list';
import { useConversationListMutations } from '../../../../../hooks/use_conversation_list_mutations';
import { useStreamingContext } from '../../../../../context/streaming/streaming_context';
import { SidebarNavList } from '../../shared/sidebar_nav_list';

import { ConversationFooter } from './conversation_footer';
import { ConversationList } from './conversation_list';
import { PinnedConversationList } from './pinned_conversation_list';
import { ConversationSearchModal } from '../../../../conversations/conversation_search_modal';
import { DROPPABLE_IDS } from './droppable_ids';

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

const pinnedLabel = i18n.translate('xpack.agentBuilder.sidebar.conversation.pinned', {
  defaultMessage: 'Pinned',
});

const conversationListScrollRegionLabel = i18n.translate(
  'xpack.agentBuilder.sidebar.conversation.conversationListScrollRegion',
  {
    defaultMessage: 'Conversation list',
  }
);

export const ConversationSidebarView: React.FC = () => {
  const { pathname } = useLocation();
  const agentId = getAgentIdFromPath(pathname) ?? agentBuilderDefaultAgentId;
  const conversationId = getConversationIdFromPath(pathname);
  const { euiTheme } = useEuiTheme();
  const {
    services: { analytics },
  } = useKibana();
  const { navigateToAgentBuilderUrl } = useNavigation();
  const validateAgentId = useValidateAgentId();
  const { isFetched: isAgentsFetched } = useAgentBuilderAgents();
  const lastAgentId = useLastAgentId();
  const routeAccessConfig = useRouteAccessConfig();

  const { conversations = [] } = useConversationList({ agentId });
  const hasConversations = conversations.length > 0;
  const { removeAllErrors, removeError } = useStreamingContext();

  const { markAsPinned, markAsUnpinned } = useConversationListMutations({
    routeConversationId: conversationId,
    agentId,
  });

  const [draggingFromId, setDraggingFromId] = useState<string | null>(null);
  const [hoveredDroppableId, setHoveredDroppableId] = useState<string | null>(null);

  const onDragStart = useCallback(({ source }: DragStart) => {
    flushSync(() => setDraggingFromId(source.droppableId));
  }, []);

  const onDragUpdate = useCallback(({ destination }: DragUpdate) => {
    setHoveredDroppableId(destination?.droppableId ?? null);
  }, []);

  const pinnedConversations = useMemo(
    () =>
      conversations
        .filter((c) => c.pinned)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [conversations]
  );

  const pinnedConversationIds = useMemo(
    () => new Set(pinnedConversations.map((c) => c.id)),
    [pinnedConversations]
  );

  const dropBackgrounds = useMemo(() => {
    const bg = (id: string) =>
      hoveredDroppableId === id
        ? euiTheme.colors.backgroundLightPrimary
        : draggingFromId !== null
        ? euiTheme.colors.backgroundBasePrimary
        : 'transparent';
    return {
      [DROPPABLE_IDS.PINNED]: bg(DROPPABLE_IDS.PINNED),
      [DROPPABLE_IDS.CHATS]: bg(DROPPABLE_IDS.CHATS),
    };
  }, [hoveredDroppableId, draggingFromId, euiTheme]);

  const onDragEnd = useCallback(
    ({ draggableId, source, destination }: DropResult) => {
      setDraggingFromId(null);
      setHoveredDroppableId(null);
      if (!destination) return;
      if (source.droppableId === destination.droppableId) return;

      if (
        source.droppableId === DROPPABLE_IDS.CHATS &&
        destination.droppableId === DROPPABLE_IDS.PINNED
      ) {
        markAsPinned(draggableId);
        analytics.reportEvent(AGENT_BUILDER_EVENT_TYPES.UiClick, {
          ebt_element: AGENT_BUILDER_UI_EBT.element.sidebar,
          ebt_action: AGENT_BUILDER_UI_EBT.action.conversationList.PIN_CONVERSATION,
          element_kind: 'other',
        });
      } else if (
        source.droppableId === DROPPABLE_IDS.PINNED &&
        destination.droppableId === DROPPABLE_IDS.CHATS
      ) {
        markAsUnpinned(draggableId);
        analytics.reportEvent(AGENT_BUILDER_EVENT_TYPES.UiClick, {
          ebt_element: AGENT_BUILDER_UI_EBT.element.sidebar,
          ebt_action: AGENT_BUILDER_UI_EBT.action.conversationList.UNPIN_CONVERSATION,
          element_kind: 'other',
        });
      }
    },
    [analytics, markAsPinned, markAsUnpinned]
  );

  const isNewConversationRoute =
    conversationId === 'new' || pathname === appPaths.agent.root({ agentId });

  const navItems = useMemo(
    () => getAgentSettingsNavItems(agentId, routeAccessConfig),
    [agentId, routeAccessConfig]
  );

  const isActive = (path: string) => pathname === path;

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const sectionLabelCss = useMemo(
    () => css`
      padding: ${euiTheme.size.xs} ${euiTheme.size.s};
    `,
    [euiTheme]
  );

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
    removeAllErrors();
    navigateToAgentBuilderUrl(appPaths.agent.conversations.new({ agentId }));
  };

  const handleConversationItemClick = (clickedConversationId: string) => {
    removeError(clickedConversationId);
  };

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      responsive={false}
      data-test-subj="agentBuilderSidebar-conversation"
      className="eui-fullHeight"
    >
      <EuiHorizontalRule margin="none" />

      <EuiFlexItem grow className="eui-fullHeight">
        <EuiFlexGroup
          direction="column"
          gutterSize="none"
          responsive={false}
          className="eui-fullHeight"
        >
          <EuiFlexItem grow className="eui-fullHeight">
            <EuiPanel
              grow
              hasBorder={false}
              hasShadow={false}
              paddingSize="m"
              className="eui-fullHeight"
            >
              <EuiFlexGroup
                direction="column"
                gutterSize="none"
                responsive={false}
                className="eui-fullHeight"
              >
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued" css={sectionLabelCss}>
                    {customizeLabel}
                  </EuiText>
                  <EuiSpacer size="xs" />
                  <SidebarNavList items={navItems} isActive={isActive} />
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiSpacer size="m" />
                </EuiFlexItem>

                <EuiFlexItem grow className="eui-fullHeight">
                  <EuiDragDropContext
                    onDragEnd={onDragEnd}
                    onDragStart={onDragStart}
                    onDragUpdate={onDragUpdate}
                  >
                    <EuiFlexGroup
                      direction="column"
                      gutterSize="none"
                      responsive={false}
                      className="eui-fullHeight"
                    >
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs" color="subdued" css={sectionLabelCss}>
                          {pinnedLabel}
                        </EuiText>
                        <EuiSpacer size="xs" />
                        <PinnedConversationList
                          agentId={agentId}
                          currentConversationId={conversationId}
                          pinnedConversations={pinnedConversations}
                          isDropDisabled={draggingFromId === DROPPABLE_IDS.PINNED}
                          backgroundColor={dropBackgrounds[DROPPABLE_IDS.PINNED]}
                          onItemClick={handleConversationItemClick}
                          isDragging={draggingFromId !== null}
                        />
                      </EuiFlexItem>

                      <EuiFlexItem grow={false}>
                        <EuiSpacer size="m" />
                      </EuiFlexItem>

                      <EuiFlexItem grow={false}>
                        <EuiText size="xs" color="subdued" css={sectionLabelCss}>
                          {chatsLabel}
                        </EuiText>
                        <EuiSpacer size="s" />
                      </EuiFlexItem>

                      <EuiFlexItem grow={false}>
                        <EuiFlexGroup gutterSize="s" responsive={false} alignItems="flexStart">
                          <EuiFlexItem grow>
                            <EuiButton
                              fullWidth
                              iconType="plus"
                              size="s"
                              color="text"
                              onClick={handlePressNewConversation}
                              data-test-subj="agentBuilderSidebarNewConversationButton"
                              {...getEbtProps({
                                element: AGENT_BUILDER_UI_EBT.element.sidebar,
                                action:
                                  AGENT_BUILDER_UI_EBT.action.conversationList.CONVERSATION_START,
                              })}
                            >
                              {newLabel}
                            </EuiButton>
                          </EuiFlexItem>
                          <EuiFlexItem grow>
                            <EuiButton
                              fullWidth
                              iconType="magnify"
                              size="s"
                              color="text"
                              aria-label={searchChatsAriaLabel}
                              onClick={() => setIsSearchModalOpen(true)}
                              disabled={!hasConversations}
                              data-test-subj="agentBuilderSidebarSearchChatsButton"
                              {...getEbtProps({
                                element: AGENT_BUILDER_UI_EBT.element.sidebar,
                                action:
                                  AGENT_BUILDER_UI_EBT.action.conversationList.CONVERSATION_SEARCH,
                              })}
                            >
                              {searchLabel}
                            </EuiButton>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiFlexItem>

                      <EuiFlexItem grow={false}>
                        <EuiSpacer size="m" />
                      </EuiFlexItem>

                      <EuiFlexItem
                        grow
                        tabIndex={0}
                        role="region"
                        aria-label={conversationListScrollRegionLabel}
                        className="eui-yScroll"
                      >
                        <ConversationList
                          agentId={agentId}
                          currentConversationId={conversationId}
                          isNewConversationRoute={isNewConversationRoute}
                          onItemClick={handleConversationItemClick}
                          pinnedConversationIds={pinnedConversationIds}
                          isDropDisabled={draggingFromId === DROPPABLE_IDS.CHATS}
                          backgroundColor={dropBackgrounds[DROPPABLE_IDS.CHATS]}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiDragDropContext>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <ConversationFooter />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      {isSearchModalOpen && (
        <ConversationSearchModal
          agentId={agentId}
          currentConversationId={conversationId}
          onClose={() => setIsSearchModalOpen(false)}
          onSelectConversation={(id) => {
            removeError(id);
            navigateToAgentBuilderUrl(
              appPaths.agent.conversations.byId({ agentId, conversationId: id })
            );
            setIsSearchModalOpen(false);
          }}
        />
      )}
    </EuiFlexGroup>
  );
};
