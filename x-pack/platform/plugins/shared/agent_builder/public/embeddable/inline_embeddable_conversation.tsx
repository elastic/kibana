/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { EmbeddableConversationDependencies, EmbeddableConversationProps } from './types';
import { EmbeddableConversationsProvider } from '../application/context/conversation/embeddable_conversations_provider';
import { Conversation } from '../application/components/conversations/conversation';
import { conversationBackgroundStyles } from '../application/components/conversations/conversation.styles';
import { EmbeddableWelcomeMessage } from './embeddable_welcome_message';
import { EmbeddableAccessBoundary } from './embeddable_access_boundary';

type InlineEmbeddableConversationProps = EmbeddableConversationDependencies &
  EmbeddableConversationProps;

export const InlineEmbeddableConversation: React.FC<InlineEmbeddableConversationProps> = (
  props
) => {
  const { euiTheme } = useEuiTheme();
  const { coreStart, services, ...conversationProps } = props;

  const wrapperStyles = css`
    display: flex;
    flex-direction: column;
    height: 100%;
    ${conversationBackgroundStyles(euiTheme)}
  `;

  const bodyStyles = css`
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `;

  const noopOnClose = () => {};

  return (
    <div css={wrapperStyles} data-test-subj="agentBuilderInlineConversation">
      <EmbeddableConversationsProvider
        {...conversationProps}
        coreStart={coreStart}
        services={services}
        onClose={noopOnClose}
        ariaLabelledBy="inline-conversation"
      >
        <EmbeddableAccessBoundary onClose={noopOnClose}>
          <EmbeddableWelcomeMessage />
          <div css={bodyStyles}>
            <Conversation />
          </div>
        </EmbeddableAccessBoundary>
      </EmbeddableConversationsProvider>
    </div>
  );
};
