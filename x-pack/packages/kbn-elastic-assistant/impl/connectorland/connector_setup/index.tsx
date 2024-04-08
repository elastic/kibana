/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { EuiCommentProps } from '@elastic/eui';
import { EuiAvatar, EuiBadge, EuiMarkdownFormat, EuiText, EuiTextAlign } from '@elastic/eui';
// eslint-disable-next-line @kbn/eslint/module_migration
import styled from 'styled-components';
import { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public/common/constants';

import { ActionType } from '@kbn/triggers-actions-ui-plugin/public';
import type { LLMMessage as Message } from '@kbn/elastic-assistant-common';
import { AddConnectorModal } from '../add_connector_modal';
import { WELCOME_CONVERSATION } from '../../assistant/use_conversation/sample_conversations';
import { Conversation } from '../../..';
import { useLoadActionTypes } from '../use_load_action_types';
import { StreamingText } from '../../assistant/streaming_text';
import { ConnectorButton } from '../connector_button';
import { useConversation } from '../../assistant/use_conversation';
import { conversationHasNoPresentationData } from './helpers';
import * as i18n from '../translations';
import { useAssistantContext } from '../../assistant_context';
import { useLoadConnectors } from '../use_load_connectors';
import { AssistantAvatar } from '../../assistant/assistant_avatar/assistant_avatar';
import { getGenAiConfig } from '../helpers';

const ConnectorButtonWrapper = styled.div`
  margin-bottom: 10px;
`;

const SkipEuiText = styled(EuiText)`
  margin-top: 20px;
`;

export interface ConnectorSetupProps {
  conversation?: Conversation;
  onSetupComplete?: () => void;
  onConversationUpdate: ({ cId, cTitle }: { cId: string; cTitle: string }) => Promise<void>;
}

export const useConnectorSetup = ({
  conversation = WELCOME_CONVERSATION,
  onSetupComplete,
  onConversationUpdate,
}: ConnectorSetupProps): {
  comments: EuiCommentProps[];
  prompt: React.ReactElement;
} => {
  const { setApiConfig } = useConversation();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  // Access all conversations so we can add connector to all on initial setup
  const { actionTypeRegistry, http } = useAssistantContext();

  const {
    data: connectors,
    isSuccess: areConnectorsFetched,
    refetch: refetchConnectors,
  } = useLoadConnectors({ http });
  const isConnectorConfigured = areConnectorsFetched && !!connectors?.length;

  const [isConnectorModalVisible, setIsConnectorModalVisible] = useState<boolean>(false);
  const [showAddConnectorButton, setShowAddConnectorButton] = useState<boolean>(() => {
    // If no presentation data on messages, default to showing add connector button so it doesn't delay render and flash on screen
    return conversationHasNoPresentationData(conversation);
  });
  const { data: actionTypes } = useLoadActionTypes({ http });

  const [selectedActionType, setSelectedActionType] = useState<ActionType | null>(null);

  const lastConversationMessageIndex = useMemo(
    () => conversation.messages.length - 1,
    [conversation.messages.length]
  );

  const [currentMessageIndex, setCurrentMessageIndex] = useState(
    // If connector is configured or conversation has already been replayed show all messages immediately
    isConnectorConfigured || conversationHasNoPresentationData(conversation)
      ? lastConversationMessageIndex
      : 0
  );

  const streamingTimeoutRef = useRef<number | undefined>(undefined);

  // Once streaming of previous message is complete, proceed to next message
  const onHandleMessageStreamingComplete = useCallback(() => {
    if (currentMessageIndex === lastConversationMessageIndex) {
      clearTimeout(streamingTimeoutRef.current);
      return;
    }
    streamingTimeoutRef.current = window.setTimeout(() => {
      bottomRef.current?.scrollIntoView({ block: 'end' });
      return setCurrentMessageIndex(currentMessageIndex + 1);
    }, conversation.messages[currentMessageIndex]?.presentation?.delay ?? 0);
    return () => clearTimeout(streamingTimeoutRef.current);
  }, [conversation.messages, currentMessageIndex, lastConversationMessageIndex]);

  // Show button to add connector after last message has finished streaming
  const onHandleLastMessageStreamingComplete = useCallback(() => {
    setShowAddConnectorButton(true);
    bottomRef.current?.scrollIntoView({ block: 'end' });
    onSetupComplete?.();
  }, [onSetupComplete]);

  // Show button to add connector after last message has finished streaming
  const handleSkipSetup = useCallback(() => {
    setCurrentMessageIndex(lastConversationMessageIndex);
  }, [lastConversationMessageIndex]);

  // Create EuiCommentProps[] from conversation messages
  const commentBody = useCallback(
    (message: Message, index: number, length: number) => {
      // If timestamp is not set, set it to current time (will update conversation at end of setup)
      if (
        conversation.messages[index].timestamp == null ||
        conversation.messages[index].timestamp.length === 0
      ) {
        conversation.messages[index].timestamp = new Date().toISOString();
      }
      const isLastMessage = index === length - 1;
      const enableStreaming =
        (message?.presentation?.stream ?? false) && currentMessageIndex !== length - 1;
      return (
        <StreamingText
          text={message.content ?? ''}
          delay={enableStreaming ? 50 : 0}
          onStreamingComplete={
            isLastMessage ? onHandleLastMessageStreamingComplete : onHandleMessageStreamingComplete
          }
        >
          {(streamedText, isStreamingComplete) => (
            <EuiText>
              <EuiMarkdownFormat className={`message-${index}`}>{streamedText}</EuiMarkdownFormat>
              <span ref={bottomRef} />
            </EuiText>
          )}
        </StreamingText>
      );
    },
    [
      conversation.messages,
      currentMessageIndex,
      onHandleLastMessageStreamingComplete,
      onHandleMessageStreamingComplete,
    ]
  );

  const comments = useMemo(
    () =>
      conversation.messages.slice(0, currentMessageIndex + 1).map((message, index) => {
        const isUser = message.role === 'user';
        const timestamp = `${i18n.CONNECTOR_SETUP_TIMESTAMP_AT}: ${new Date(
          message.timestamp
        ).toLocaleString()}`;
        const commentProps: EuiCommentProps = {
          username: isUser ? i18n.CONNECTOR_SETUP_USER_YOU : i18n.CONNECTOR_SETUP_USER_ASSISTANT,
          children: commentBody(message, index, conversation.messages.length),
          timelineAvatar: (
            <EuiAvatar
              name={i18n.CONNECTOR_SETUP_USER_ASSISTANT}
              size="l"
              color="subdued"
              iconType={AssistantAvatar}
            />
          ),
          timestamp,
        };
        return commentProps;
      }),
    [commentBody, conversation.messages, currentMessageIndex]
  );

  const onSaveConnector = useCallback(
    async (connector: ActionConnector) => {
      const config = getGenAiConfig(connector);
      // persist only the active conversation
      const updatedConversation = await setApiConfig({
        conversation,
        apiConfig: {
          ...conversation.apiConfig,
          connectorId: connector.id,
          actionTypeId: connector.actionTypeId,
          provider: config?.apiProvider,
          model: config?.defaultModel,
        },
      });

      if (updatedConversation) {
        onConversationUpdate({ cId: updatedConversation.id, cTitle: updatedConversation.title });

        refetchConnectors?.();
        setIsConnectorModalVisible(false);
      }
    },
    [conversation, onConversationUpdate, refetchConnectors, setApiConfig]
  );

  return {
    comments,
    prompt: (
      <div data-test-subj="prompt">
        {showAddConnectorButton && (
          <ConnectorButtonWrapper>
            <ConnectorButton setIsConnectorModalVisible={setIsConnectorModalVisible} />
          </ConnectorButtonWrapper>
        )}
        {!showAddConnectorButton && (
          <SkipEuiText color="subdued" size={'xs'}>
            <EuiTextAlign textAlign="center">
              <EuiBadge
                color="hollow"
                data-test-subj="skip-setup-button"
                onClick={handleSkipSetup}
                onClickAriaLabel={i18n.CONNECTOR_SETUP_SKIP}
              >
                {i18n.CONNECTOR_SETUP_SKIP}
              </EuiBadge>
            </EuiTextAlign>
          </SkipEuiText>
        )}
        {isConnectorModalVisible && (
          <AddConnectorModal
            actionTypeRegistry={actionTypeRegistry}
            actionTypes={actionTypes}
            onClose={() => setIsConnectorModalVisible(false)}
            onSaveConnector={onSaveConnector}
            onSelectActionType={(actionType: ActionType) => setSelectedActionType(actionType)}
            selectedActionType={selectedActionType}
          />
        )}
      </div>
    ),
  };
};
