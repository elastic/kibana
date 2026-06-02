/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlyoutBody, EuiFlyoutHeader, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { EmbeddableConversationInternalProps } from './types';
import { EmbeddableConversationsProvider } from '../application/context/conversation/embeddable_conversations_provider';
import { Conversation } from '../application/components/conversations/conversation';
import { ConversationDetailShell } from '../application/components/conversations/detail/conversation_detail_shell';
import { shouldShowTemplateDetailShell } from '../application/components/conversations/detail/template_conversation_utils';
import { EmbeddableConversationHeader } from '../application/components/conversations/embeddable_conversation_header/embeddable_conversation_header';
import {
  conversationBackgroundStyles,
  headerHeight,
} from '../application/components/conversations/conversation.styles';
import { EmbeddableWelcomeMessage } from './embeddable_welcome_message';
import { EmbeddableAccessBoundary } from './embeddable_access_boundary';
import { useConversation } from '../application/hooks/use_conversation';
import { useConversationId } from '../application/context/conversation/use_conversation_id';

const useShowTemplateDetailShell = () => {
  const conversationId = useConversationId();
  const { conversation, isLoading } = useConversation();
  return Boolean(conversationId) && (isLoading || shouldShowTemplateDetailShell(conversation));
};

const EmbeddableConversationBody: React.FC<{ onClose?: () => void; ariaLabelledBy?: string }> = ({
  onClose,
  ariaLabelledBy,
}) => {
  const showTemplateDetailShell = useShowTemplateDetailShell();

  if (showTemplateDetailShell) {
    return <ConversationDetailShell onClose={onClose} ariaLabelledBy={ariaLabelledBy} />;
  }

  return <Conversation />;
};

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
      height: 100%;
      overflow: hidden;
      padding: 0;
    }
  `;

  return (
    <div css={wrapperStyles} data-test-subj="agentBuilderConversation">
      <EmbeddableConversationsProvider {...props}>
        <EmbeddableAccessBoundary onClose={onClose}>
          <EmbeddableConversationChrome
            onClose={onClose}
            ariaLabelledBy={ariaLabelledBy}
            headerStyles={headerStyles}
            bodyStyles={bodyStyles}
          />
        </EmbeddableAccessBoundary>
      </EmbeddableConversationsProvider>
    </div>
  );
};

const EmbeddableConversationChrome: React.FC<{
  onClose?: () => void;
  ariaLabelledBy?: string;
  headerStyles: ReturnType<typeof css>;
  bodyStyles: ReturnType<typeof css>;
}> = ({ onClose, ariaLabelledBy, headerStyles, bodyStyles }) => {
  const showTemplateDetailShell = useShowTemplateDetailShell();

  if (showTemplateDetailShell) {
    return <EmbeddableConversationBody onClose={onClose} ariaLabelledBy={ariaLabelledBy} />;
  }

  return (
    <>
      <EuiFlyoutHeader css={headerStyles}>
        <EmbeddableConversationHeader onClose={onClose} ariaLabelledBy={ariaLabelledBy} />
      </EuiFlyoutHeader>
      <EmbeddableWelcomeMessage />
      <EuiFlyoutBody css={bodyStyles}>
        <EmbeddableConversationBody onClose={onClose} ariaLabelledBy={ariaLabelledBy} />
      </EuiFlyoutBody>
    </>
  );
};
