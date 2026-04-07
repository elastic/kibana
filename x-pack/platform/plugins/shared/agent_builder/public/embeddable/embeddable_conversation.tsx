/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import { EuiFlyoutBody, EuiFlyoutHeader, useEuiTheme } from '@elastic/eui';
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
import { useSendMessage } from '../application/context/send_message/send_message_context';
import { useConversationContext } from '../application/context/conversation/conversation_context';
import { useAgentBuilderServices } from '../application/hooks/use_agent_builder_service';
import { useExternalRound } from '../application/hooks/use_external_round';

/**
 * Null-render component that subscribes to externally-triggered rounds (e.g. ask_conversation)
 * and streams their response into this conversation's React Query cache in real time.
 * Must be rendered inside EmbeddableConversationsProvider so it has access to the conversation context.
 */
const ExternalRoundWatcher: React.FC = () => {
  useExternalRound();
  return null;
};

/**
 * Null-render component that reports loading state and title changes upward via callbacks.
 * Must be rendered inside SendMessageProvider and ConversationContext.
 */
const LoadingStateReporter: React.FC<{
  onLoadingStateChange?: (isLoading: boolean) => void;
  onTitleChange?: (title: string) => void;
  onRoundComplete?: (conversationId: string) => void;
}> = ({ onLoadingStateChange, onTitleChange, onRoundComplete }) => {
  const { isResponseLoading } = useSendMessage();
  const { conversationId } = useConversationContext();
  const { conversationsService } = useAgentBuilderServices();
  const prevConversationIdRef = useRef<string | undefined>(undefined);
  const wasLoadingRef = useRef(false);

  useEffect(() => {
    const wasLoading = wasLoadingRef.current;
    wasLoadingRef.current = isResponseLoading;
    onLoadingStateChange?.(isResponseLoading);
    // Fire onRoundComplete on the loading true→false transition
    if (wasLoading && !isResponseLoading && conversationId) {
      onRoundComplete?.(conversationId);
    }
  }, [isResponseLoading, conversationId, onLoadingStateChange, onRoundComplete]);

  // When this tab's conversation ID is set or changes, fetch and report its title.
  // Using conversationId from context is per-tab — no cross-tab correlation needed.
  useEffect(() => {
    if (!conversationId || !onTitleChange) return;
    if (prevConversationIdRef.current === conversationId) return;
    prevConversationIdRef.current = conversationId;

    conversationsService
      .get({ conversationId })
      .then((conv) => {
        if (conv?.title) onTitleChange(conv.title);
      })
      .catch(() => {});
  }, [conversationId, conversationsService, onTitleChange]);

  return null;
};

export const EmbeddableConversationInternal: React.FC<EmbeddableConversationInternalProps> = (
  props
) => {
  const { euiTheme } = useEuiTheme();
  const { onClose, ariaLabelledBy, onLoadingStateChange, onTitleChange, onRoundComplete } = props;

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

  return (
    <div css={wrapperStyles}>
      <EmbeddableConversationsProvider {...props}>
        <EmbeddableAccessBoundary onClose={onClose}>
          <EuiFlyoutHeader css={headerStyles}>
            <EmbeddableConversationHeader onClose={onClose} ariaLabelledBy={ariaLabelledBy} />
          </EuiFlyoutHeader>
          <EmbeddableWelcomeMessage />
          <EuiFlyoutBody css={bodyStyles}>
            <ExternalRoundWatcher />
            <LoadingStateReporter
              onLoadingStateChange={onLoadingStateChange}
              onTitleChange={onTitleChange}
              onRoundComplete={onRoundComplete}
            />
            <Conversation />
          </EuiFlyoutBody>
        </EmbeddableAccessBoundary>
      </EmbeddableConversationsProvider>
    </div>
  );
};
