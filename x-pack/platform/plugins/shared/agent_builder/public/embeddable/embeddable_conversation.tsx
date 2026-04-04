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

/**
 * Null-render component that reports loading state and title changes upward via callbacks.
 * Must be rendered inside SendMessageProvider and ConversationContext.
 */
const LoadingStateReporter: React.FC<{
  onLoadingStateChange?: (isLoading: boolean) => void;
  onTitleChange?: (title: string) => void;
}> = ({ onLoadingStateChange, onTitleChange }) => {
  const { isResponseLoading } = useSendMessage();
  const { conversationId } = useConversationContext();
  const { conversationsService } = useAgentBuilderServices();
  const prevConversationIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    onLoadingStateChange?.(isResponseLoading);
  }, [isResponseLoading, onLoadingStateChange]);

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
  const { onClose, ariaLabelledBy, onLoadingStateChange, onTitleChange } = props;

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
            <LoadingStateReporter
              onLoadingStateChange={onLoadingStateChange}
              onTitleChange={onTitleChange}
            />
            <Conversation />
          </EuiFlyoutBody>
        </EmbeddableAccessBoundary>
      </EmbeddableConversationsProvider>
    </div>
  );
};
