/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { EuiFlyoutBody, EuiFlyoutHeader, EuiTab, EuiTabs, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { EmbeddableConversationInternalProps } from './types';
import { EmbeddableConversationsProvider } from '../application/context/conversation/embeddable_conversations_provider';
import { Conversation } from '../application/components/conversations/conversation';
import { EmbeddableConversationHeader } from '../application/components/conversations/embeddable_conversation_header/embeddable_conversation_header';
import {
  conversationBackgroundStyles,
  headerHeight,
} from '../application/components/conversations/conversation.styles';
import { EmbeddableWelcomeMessage } from './embeddable_welcome_message';
import { EmbeddableAccessBoundary } from './embeddable_access_boundary';
import { useAgentBuilderServices } from '../application/hooks/use_agent_builder_service';
import { useConversation } from '../application/hooks/use_conversation';

// Below this sidebar width (px) the side-by-side layout is too cramped; collapse to tabs.
const SIDE_BY_SIDE_MIN_WIDTH = 750;

/**
 * Renders the body section of the sidebar. When the conversation's template has registered
 * UI tabs, shows either a side-by-side layout (wide) or a tabbed layout (narrow).
 * In the tabbed layout the overview tab is selected by default.
 * Must live inside EmbeddableConversationsProvider so it can read conversation + services.
 */
function TemplateAwareBody(): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const { conversationTemplatesService } = useAgentBuilderServices();
  const { conversation } = useConversation();

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'chat'>('overview');

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const uiDef = conversation?.template_id
    ? conversationTemplatesService.getTemplateUIDefinition(conversation.template_id)
    : undefined;

  const resolvedTabs = (uiDef?.tabs ?? [])
    .map((id) => ({ id, def: conversationTemplatesService.getTab(id) }))
    .filter(
      (t): t is { id: string; def: NonNullable<ReturnType<typeof conversationTemplatesService.getTab>> } =>
        t.def != null
    );

  const hasTabs = resolvedTabs.length > 0;

  const bodyStyles = css`
    flex: 1;
    min-height: 0;

    .euiFlyoutBody__overflow {
      overflow: hidden;
      height: 100%;
    }

    .euiFlyoutBody__overflowContent {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100%;
      overflow: hidden;
      padding: 0;
    }
  `;

  if (!hasTabs) {
    return (
      <EuiFlyoutBody css={bodyStyles}>
        <Conversation />
      </EuiFlyoutBody>
    );
  }

  const FirstTabContent = resolvedTabs[0].def.content;
  const isNarrow = containerWidth !== null && containerWidth < SIDE_BY_SIDE_MIN_WIDTH;

  return (
    <div
      ref={containerRef}
      css={css`
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        overflow: hidden;
      `}
    >
      {isNarrow ? (
        <>
          <EuiTabs size="s" css={css`flex-shrink: 0; padding: 0 ${euiTheme.size.base};`}>
            <EuiTab isSelected={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
              Overview
            </EuiTab>
            <EuiTab isSelected={activeTab === 'chat'} onClick={() => setActiveTab('chat')}>
              Chat
            </EuiTab>
          </EuiTabs>
          {activeTab === 'overview' ? (
            <div
              css={css`
                flex: 1;
                min-height: 0;
                overflow-y: auto;
                padding: ${euiTheme.size.base};
              `}
            >
              {conversation && <FirstTabContent conversation={conversation} />}
            </div>
          ) : (
            <EuiFlyoutBody css={bodyStyles}>
              <Conversation />
            </EuiFlyoutBody>
          )}
        </>
      ) : (
        <div
          css={css`
            display: flex;
            flex-direction: row;
            flex: 1;
            min-height: 0;
            overflow: hidden;
          `}
        >
          <div
            css={css`
              flex: 3;
              min-width: 0;
              display: flex;
              flex-direction: column;
              overflow: hidden;
            `}
          >
            <EuiFlyoutBody css={bodyStyles}>
              <Conversation />
            </EuiFlyoutBody>
          </div>
          <div
            css={css`
              flex: 2;
              min-width: 0;
              overflow-y: auto;
              border-left: 1px solid ${euiTheme.border.color};
              padding: ${euiTheme.size.base};
            `}
          >
            {conversation && <FirstTabContent conversation={conversation} />}
          </div>
        </div>
      )}
    </div>
  );
}

export const EmbeddableConversationInternal: React.FC<EmbeddableConversationInternalProps> = (
  props
) => {
  const { euiTheme } = useEuiTheme();
  const { onClose, ariaLabelledBy } = props;

  const wrapperStyles = css`
    display: flex;
    flex-direction: column;
    height: 100%;
    ${conversationBackgroundStyles(euiTheme)}
  `;

  const headerStyles = css`
    display: flex;
    height: ${headerHeight}px;
    &.euiFlyoutHeader {
      padding-inline: 0;
      padding-block-start: 0;
      padding: ${euiTheme.size.base};
    }
  `;

  return (
    <div css={wrapperStyles} data-test-subj="agentBuilderConversation">
      <EmbeddableConversationsProvider {...props}>
        <EmbeddableAccessBoundary onClose={onClose}>
          <EuiFlyoutHeader css={headerStyles}>
            <EmbeddableConversationHeader onClose={onClose} ariaLabelledBy={ariaLabelledBy} />
          </EuiFlyoutHeader>
          <EmbeddableWelcomeMessage />
          <TemplateAwareBody />
        </EmbeddableAccessBoundary>
      </EmbeddableConversationsProvider>
    </div>
  );
};
