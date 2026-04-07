/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { css } from '@emotion/react';
import useObservable from 'react-use/lib/useObservable';
import type { SidebarComponentProps } from '@kbn/core-chrome-sidebar';
import { isToolResultEvent, platformCoreTools } from '@kbn/agent-builder-common';
import { createEmbeddableConversation } from '../embeddable/create_embeddable_conversation';
import { sidebarServices$, sidebarRuntimeContext$ } from './sidebar_context';
import { SidebarTabBar } from './sidebar_tab_bar';
import { useSidebarTabs, getSessionTag, generateTabId } from './use_sidebar_tabs';

const outerStyles = css`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  min-height: 0;
  overflow: hidden;
`;

const conversationWrapStyles = css`
  flex: 1;
  min-height: 0;
  overflow: hidden;
  position: relative;
`;

// Shared key for the conversation ID in localStorage — mirrors storage_keys.ts
const getLastConversationKey = (sessionTag: string) =>
  `agentBuilder.lastConversation.${sessionTag}.default`;

export function SidebarConversation({ onClose }: SidebarComponentProps): React.ReactElement | null {
  const services = useObservable(sidebarServices$);
  const runtimeContext = useObservable(sidebarRuntimeContext$);

  const {
    tabs,
    activeTabId,
    addTab,
    addTabWithId,
    spawnTab,
    closeTab,
    setActiveTab,
    updateTabTitle,
    markTabDone,
    setTabLoading,
  } = useSidebarTabs();

  // Track per-tab loading state so we can detect when a background tab finishes
  const tabLoadingRef = React.useRef<Record<string, boolean>>({});
  // Stable ref so the EventsService subscription always calls the latest spawnTab
  const spawnTabRef = useRef(spawnTab);
  spawnTabRef.current = spawnTab;
  // Stable ref to avoid stale closure in the title-fetch effect below
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  const ConversationComponent = useMemo(
    () =>
      services
        ? createEmbeddableConversation({
            services: services.services,
            coreStart: services.coreStart,
          })
        : null,
    [services]
  );

  // Fetch titles for restored tabs (those that already have a conversation).
  // Runs only when services first become available; uses tabsRef to avoid a stale closure.
  useEffect(() => {
    if (!services) return;
    tabsRef.current.forEach((tab) => {
      if (tab.isNew) return; // new tab has no persisted conversation yet
      if (tab.title !== 'New Chat') return; // already have a real title
      const conversationId = localStorage.getItem(getLastConversationKey(getSessionTag(tab.id)));
      if (!conversationId) return;
      services.services.conversationsService
        .get({ conversationId })
        .then((conversation) => {
          if (conversation?.title) {
            updateTabTitle(tab.id, conversation.title);
          }
        })
        .catch(() => {
          // ignore — tab keeps its default title
        });
    });
  }, [services, updateTabTitle]);

  // Listen for spawn_conversation tool results and open new background tabs.
  useEffect(() => {
    if (!services) return;
    const sub = services.services.eventsService.obs$.subscribe((event) => {
      if (!isToolResultEvent(event)) return;
      if (event.data.tool_id !== platformCoreTools.spawnConversation) return;
      const result = event.data.results?.[0];
      if (!result) return;
      const data = result.data as Record<string, unknown> | undefined;
      if (!data) return;
      const initialMessage =
        typeof data.initial_message === 'string' ? data.initial_message : undefined;
      const title = typeof data.title === 'string' ? data.title : undefined;
      const forkedConversationId =
        typeof data.conversation_id === 'string' ? data.conversation_id : undefined;
      const connectorId = typeof data.connector_id === 'string' ? data.connector_id : undefined;
      spawnTabRef.current({ initialMessage, title, forkedConversationId, connectorId });
    });
    return () => sub.unsubscribe();
  }, [services]);

  if (!services || !runtimeContext || !ConversationComponent) {
    return null;
  }

  const { options, onRegisterCallbacks, onClose: contextOnClose } = runtimeContext;
  const { onClose: externalOnClose, ...restOptions } = options;

  const handleOnClose = () => {
    onClose();
    externalOnClose?.();
    contextOnClose?.();
  };

  return (
    <div css={outerStyles}>
      <SidebarTabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabClick={setActiveTab}
        onTabClose={closeTab}
        onNewTab={addTab}
      />

      <div css={conversationWrapStyles}>
        {tabs.map((tab, idx) => (
          <div
            key={tab.id}
            style={{
              display: tab.id === activeTabId ? 'flex' : 'none',
              flexDirection: 'column',
              height: '100%',
            }}
          >
            <ConversationComponent
              sessionTag={getSessionTag(tab.id)}
              newConversation={tab.isNew}
              initialMessage={tab.initialMessage}
              autoSendInitialMessage={tab.autoSendInitialMessage}
              connectorId={tab.connectorId}
              onClose={handleOnClose}
              ariaLabelledBy={`agent-builder-sidebar-tab-${tab.id}`}
              {...(idx === 0 ? restOptions : {})}
              {...(idx === 0 ? { onRegisterCallbacks } : {})}
              onLoadingStateChange={(isLoading) => {
                const wasLoading = tabLoadingRef.current[tab.id];
                tabLoadingRef.current[tab.id] = isLoading;
                setTabLoading(tab.id, isLoading);
                // Transition loading→done while tab is in the background → mark unread
                if (wasLoading && !isLoading) {
                  markTabDone(tab.id);
                }
              }}
              onTitleChange={(title) => updateTabTitle(tab.id, title)}
              onRoundComplete={(conversationId) => {
                if (!services) return;
                services.services.conversationsService
                  .summarize({ conversationId })
                  .then(({ summary }) => {
                    try {
                      localStorage.setItem(
                        `agentBuilder.sidebar.tab.${tab.id}.summary`,
                        JSON.stringify(summary)
                      );
                    } catch {
                      // ignore storage errors
                    }
                  })
                  .catch(() => {});
              }}
              onFork={(forkedConversationId) => {
                if (forkedConversationId) {
                  // Fork of an existing conversation: pre-seed localStorage so the new tab
                  // restores it on mount. Must be JSON.stringify'd — react-use reads via JSON.parse.
                  const newTabId = generateTabId();
                  const sessionTag = getSessionTag(newTabId);
                  localStorage.setItem(
                    `agentBuilder.lastConversation.${sessionTag}.default`,
                    JSON.stringify(forkedConversationId)
                  );
                  addTabWithId(newTabId);
                } else {
                  // No parent conversation — open a blank new tab
                  addTab();
                }
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
