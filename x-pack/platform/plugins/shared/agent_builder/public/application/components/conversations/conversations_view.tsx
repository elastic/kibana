/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Conversation } from './conversation';
import { ConversationHeader } from './conversation_header/conversation_header';
import { AgentBuilderTourProvider } from '../../context/agent_builder_tour_context';
import { RoutedConversationsProvider } from '../../context/conversation/routed_conversations_provider';
import { SendMessageProvider } from '../../context/send_message/send_message_context';
import {
  AgentOverridesProvider,
  useAgentOverrides,
} from '../../context/agent_overrides/agent_overrides_context';
import { conversationBackgroundStyles, headerHeight } from './conversation.styles';
import { AgentOverridesPanel } from './agent_overrides_panel/agent_overrides_panel';
import { useConversationId } from '../../context/conversation/use_conversation_id';
import { useAgentId } from '../../hooks/use_conversation';

/**
 * Inner component that manages the split-screen layout with AgentOverridesPanel.
 * Must be rendered inside AgentOverridesProvider.
 */
const ConversationWithAgentOverridesPanel: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const conversationId = useConversationId();
  const agentId = useAgentId();
  const { resetOverrides } = useAgentOverrides();

  const [isAgentOverridesPanelOpen, setIsAgentOverridesPanelOpen] = useState(false);
  const prevConversationIdRef = useRef<string | undefined>(conversationId);
  const prevAgentIdRef = useRef<string | undefined>(agentId);

  const toggleAgentOverridesPanel = useCallback(() => {
    setIsAgentOverridesPanelOpen((prev) => !prev);
  }, []);

  const closeAgentOverridesPanel = useCallback(() => {
    setIsAgentOverridesPanelOpen(false);
  }, []);

  // Close panel and reset overrides when conversation changes
  useEffect(() => {
    const prevConversationId = prevConversationIdRef.current;
    if (prevConversationId && conversationId !== prevConversationId) {
      closeAgentOverridesPanel();
      resetOverrides();
    }
    prevConversationIdRef.current = conversationId;
  }, [conversationId, closeAgentOverridesPanel, resetOverrides]);

  // Close panel when agent changes (context handles re-initialization)
  useEffect(() => {
    const prevAgentId = prevAgentIdRef.current;
    if (prevAgentId && agentId !== prevAgentId) {
      closeAgentOverridesPanel();
    }
    prevAgentIdRef.current = agentId;
  }, [agentId, closeAgentOverridesPanel]);

  const splitContainerStyles = css`
    width: 100%;
    height: 100%;
    display: flex;
  `;

  const conversationPanelStyles = css`
    height: 100%;
    width: ${isAgentOverridesPanelOpen ? '50%' : '100%'};
    transition: width 0.2s ease-out;
    display: flex;
    align-items: center;
  `;

  const agentOverridesPanelStyles = css`
    height: 100%;
    width: 50%;
    border-left: ${euiTheme.border.thin};
  `;

  return (
    <EuiFlexGroup css={splitContainerStyles} responsive={false}>
      <EuiFlexItem css={conversationPanelStyles} grow={false}>
        <Conversation onModifyClick={toggleAgentOverridesPanel} />
      </EuiFlexItem>
      {isAgentOverridesPanelOpen && (
        <EuiFlexItem css={agentOverridesPanelStyles} grow={false}>
          <AgentOverridesPanel onClose={closeAgentOverridesPanel} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

export const AgentBuilderConversationsView: React.FC<{}> = () => {
  const { euiTheme } = useEuiTheme();

  const mainStyles = css`
    border: none;
    ${conversationBackgroundStyles(euiTheme)}
  `;
  const headerStyles = css`
    justify-content: center;
    height: ${headerHeight}px;
  `;
  const contentStyles = css`
    width: 100%;
    height: 100%;
    max-block-size: calc(var(--kbn-application--content-height) - ${headerHeight}px);
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0 ${euiTheme.size.base} ${euiTheme.size.base} ${euiTheme.size.base};
  `;

  const labels = {
    header: i18n.translate('xpack.agentBuilder.conversationsView.header', {
      defaultMessage: 'Conversation header',
    }),
    content: i18n.translate('xpack.agentBuilder.conversationsView.content', {
      defaultMessage: 'Conversation content',
    }),
  };

  return (
    <RoutedConversationsProvider>
      <AgentOverridesProvider>
        <SendMessageProvider>
          <AgentBuilderTourProvider>
            <KibanaPageTemplate
              offset={0}
              restrictWidth={false}
              data-test-subj="agentBuilderPageConversations"
              grow={false}
              panelled={false}
              mainProps={{
                css: mainStyles,
              }}
              responsive={[]}
            >
              <KibanaPageTemplate.Header
                css={headerStyles}
                bottomBorder={false}
                aria-label={labels.header}
                paddingSize="m"
                responsive={false}
              >
                <ConversationHeader />
              </KibanaPageTemplate.Header>
              <KibanaPageTemplate.Section
                paddingSize="none"
                grow
                contentProps={{
                  css: contentStyles,
                }}
                aria-label={labels.content}
              >
                <ConversationWithAgentOverridesPanel />
              </KibanaPageTemplate.Section>
            </KibanaPageTemplate>
          </AgentBuilderTourProvider>
        </SendMessageProvider>
      </AgentOverridesProvider>
    </RoutedConversationsProvider>
  );
};
