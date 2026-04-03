/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { css } from '@emotion/react';
import useObservable from 'react-use/lib/useObservable';
import type { SidebarComponentProps } from '@kbn/core-chrome-sidebar';
import { createEmbeddableConversation } from '../embeddable/create_embeddable_conversation';
import { sidebarServices$, sidebarRuntimeContext$ } from './sidebar_context';
import { SidebarTabBar } from './sidebar_tab_bar';
import { useSidebarTabs, getSessionTag } from './use_sidebar_tabs';

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

  const { tabs, activeTabId, addTab, closeTab, setActiveTab, updateTabTitle, markTabDone, setTabLoading } =
    useSidebarTabs();

  // Track per-tab loading state so we can detect when a background tab finishes
  const tabLoadingRef = React.useRef<Record<string, boolean>>({});

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

  // Fetch titles for restored tabs (those that already have a conversation)
  useEffect(() => {
    if (!services) return;
    tabs.forEach((tab) => {
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
    // Run only when services first become available
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
              // Only start fresh for brand-new tabs; restored tabs reload their last conversation
              newConversation={tab.isNew}
              onClose={handleOnClose}
              ariaLabelledBy={`agent-builder-sidebar-tab-${tab.id}`}
              // Pass external props (agentId, attachments, etc.) only to the primary tab
              {...(idx === 0 ? restOptions : {})}
              // Only the first tab registers callbacks so the plugin can route addAttachment() etc.
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
            />
          </div>
        ))}
      </div>
    </div>
  );
}
