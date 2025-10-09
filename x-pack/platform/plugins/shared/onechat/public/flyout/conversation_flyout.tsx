/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** @jsx jsx */
import { jsx } from '@emotion/react';
import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiFlyoutResizable,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { EmbeddableConversationProps } from '../embeddable';
import type { ConversationFlyoutProps } from './types';
import { storeFlyoutConversation, clearFlyoutConversation } from './flyout_conversation_storage';

interface ConversationFlyoutInternalProps extends ConversationFlyoutProps {
  ConversationComponent: React.ComponentType<EmbeddableConversationProps>;
}

export const ConversationFlyout: React.FC<ConversationFlyoutInternalProps> = ({
  conversationId: initialConversationId,
  agentId,
  additionalContext,
  customMessage,
  clientTools,
  onConversationCreated,
  onClose,
  ConversationComponent,
}) => {
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  // Key to force remount of conversation component when starting a new chat
  const [conversationKey, setConversationKey] = useState(0);

  // Store the conversation when it's first opened (if already has an ID)
  useEffect(() => {
    if (initialConversationId) {
      storeFlyoutConversation(initialConversationId, agentId);
    }
  }, [initialConversationId, agentId]);

  // Handle conversation creation
  const handleConversationCreated = useCallback(
    (id: string) => {
      setConversationId(id);
      // Store the new conversation in localStorage
      storeFlyoutConversation(id, agentId);
      onConversationCreated?.(id);
    },
    [onConversationCreated, agentId]
  );

  // Handle starting a new conversation
  const handleNewChat = useCallback(() => {
    setConversationId(undefined);
    clearFlyoutConversation();
    // Force remount of the conversation component to clear all state
    setConversationKey((prev) => prev + 1);
  }, []);

  const flyoutBodyStyles = css`
    padding: 0;
    display: flex;
    flex-direction: column;
    .euiFlyoutBody__overflowContent {
      padding: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
  `;

  const conversationContainerStyles = css`
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  `;

  return (
    <EuiFlyoutResizable
      onClose={onClose}
      aria-labelledby="conversation-flyout-title"
      size="m"
      minWidth={400}
      maxWidth={1200}
      ownFocus
      data-test-subj="onechat-conversation-flyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m">
          <EuiFlexItem grow={true}>
            <EuiTitle size="m">
              <h2 id="conversation-flyout-title">
                {conversationId
                  ? i18n.translate('xpack.onechat.flyout.existingConversationTitle', {
                      defaultMessage: 'Conversation',
                    })
                  : i18n.translate('xpack.onechat.flyout.newConversationTitle', {
                      defaultMessage: 'New Conversation',
                    })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="plus"
              onClick={handleNewChat}
              size="s"
              aria-label={i18n.translate('xpack.onechat.flyout.newChatButtonAriaLabel', {
                defaultMessage: 'Start a new conversation',
              })}
              data-test-subj="onechat-flyout-new-chat-button"
            >
              {i18n.translate('xpack.onechat.flyout.newChatButton', {
                defaultMessage: 'New chat',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody css={flyoutBodyStyles}>
        <div css={conversationContainerStyles}>
          <ConversationComponent
            key={conversationKey}
            conversationId={conversationId}
            agentId={agentId}
            additionalContext={additionalContext}
            customMessage={customMessage}
            clientTools={clientTools}
            height="100%"
            onConversationCreated={handleConversationCreated}
          />
        </div>
      </EuiFlyoutBody>
    </EuiFlyoutResizable>
  );
};
