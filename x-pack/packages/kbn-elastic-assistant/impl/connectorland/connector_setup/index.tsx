/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef, useState } from 'react';
import type { EuiCommentProps } from '@elastic/eui';
import {
  EuiAvatar,
  EuiBadge,
  EuiCommentList,
  EuiMarkdownFormat,
  EuiText,
  EuiTextAlign,
} from '@elastic/eui';
// eslint-disable-next-line @kbn/eslint/module_migration
import styled from 'styled-components';
import { ConnectorAddModal } from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';

import { HttpSetup } from '@kbn/core-http-browser';
import { ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import {
  GEN_AI_CONNECTOR_ID,
  OpenAiProviderType,
} from '@kbn/stack-connectors-plugin/public/common';
import { BASE_CONVERSATIONS, Conversation, Message } from '@kbn/elastic-assistant';
import useEvent from 'react-use/lib/useEvent';
import { ActionConnectorProps } from '@kbn/triggers-actions-ui-plugin/public/types';
import { useLoadActionTypes } from '../use_load_action_types';
import { StreamingText } from '../../assistant/streaming_text';
import { ConnectorButton } from '../connector_button';
import { useConversation } from '../../assistant/use_conversation';
import { clearPresentationData, conversationHasNoPresentationData } from './helpers';
import * as i18n from '../translations';
import { useAssistantContext } from '../../assistant_context';

const MESSAGE_INDEX_BEFORE_CONNECTOR = 2;

const CommentsContainer = styled.div`
  max-height: 600px;
  overflow-y: scroll;
`;

const StyledCommentList = styled(EuiCommentList)`
  margin-right: 20px;
`;

const ConnectorButtonWrapper = styled.div`
  margin-top: 20px;
`;

const SkipEuiText = styled(EuiText)`
  margin-top: 20px;
`;

interface Config {
  apiProvider: string;
}

export interface ConnectorSetupProps {
  isConnectorConfigured: boolean;
  actionTypeRegistry: ActionTypeRegistryContract;
  conversation?: Conversation;
  http: HttpSetup;
  onSetupComplete?: () => void;
  refetchConnectors?: () => void;
}

export const ConnectorSetup: React.FC<ConnectorSetupProps> = React.memo<ConnectorSetupProps>(
  ({
    actionTypeRegistry,
    conversation = BASE_CONVERSATIONS.welcome,
    http,
    isConnectorConfigured = false,
    onSetupComplete,
    refetchConnectors,
  }) => {
    const { appendMessage, setApiConfig, setConversation } = useConversation();
    const lastCommentRef = useRef<HTMLDivElement | null>(null);
    const bottomRef = useRef<HTMLDivElement | null>(null);

    // Access all conversations so we can add connector to all on initial setup
    const { conversations } = useAssistantContext();

    const [isConnectorModalVisible, setIsConnectorModalVisible] = useState<boolean>(false);
    const [showAddConnectorButton, setShowAddConnectorButton] = useState<boolean>(() => {
      // If no presentation data on messages, default to showing add connector button so it doesn't delay render and flash on screen
      return conversationHasNoPresentationData(conversation);
    });
    const { data: actionTypes } = useLoadActionTypes({ http });

    const actionType = actionTypes?.find((at) => at.id === GEN_AI_CONNECTOR_ID) ?? {
      enabledInConfig: true,
      enabledInLicense: true,
      minimumLicenseRequired: 'platinum',
      supportedFeatureIds: ['general'],
      id: '.gen-ai',
      name: 'Generative AI',
      enabled: true,
    };

    // User constants
    const userName = conversation.theme?.user?.name ?? i18n.CONNECTOR_SETUP_USER_YOU;
    const assistantName =
      conversation.theme?.assistant?.name ?? i18n.CONNECTOR_SETUP_USER_ASSISTANT;

    const [currentMessageIndex, setCurrentMessageIndex] = useState(
      // If connector is configured or conversation has already been replayed show all messages immediately
      isConnectorConfigured || conversationHasNoPresentationData(conversation)
        ? MESSAGE_INDEX_BEFORE_CONNECTOR
        : 0
    );

    // Register keyboard listener to show the add connector modal when SPACE is pressed
    // Ideally this would be done by focusing the button once rendered, but can't seem to get focus to the EuiCard via refs/tabindex
    const onKeyDown = useCallback(
      (event: KeyboardEvent) => {
        if (event.key === ' ' && !isConnectorModalVisible) {
          // Skip intro still going
          if (!showAddConnectorButton) {
            setCurrentMessageIndex(MESSAGE_INDEX_BEFORE_CONNECTOR);
            event.preventDefault();
          } else {
            setIsConnectorModalVisible(true);
            event.preventDefault();
          }
        }
      },
      [isConnectorModalVisible, showAddConnectorButton]
    );
    useEvent('keydown', onKeyDown);

    // Once streaming of previous message is complete, proceed to next message
    const onHandleMessageStreamingComplete = useCallback(() => {
      const timeoutId = setTimeout(
        () => setCurrentMessageIndex(currentMessageIndex + 1),
        conversation.messages[currentMessageIndex].presentation?.delay ?? 0
      );

      return () => clearTimeout(timeoutId);
    }, [conversation.messages, currentMessageIndex]);

    // Show button to add connector after last message has finished streaming
    const onHandleLastMessageStreamingComplete = useCallback(() => {
      setShowAddConnectorButton(true);
      onSetupComplete?.();
      setConversation({ conversation: clearPresentationData(conversation) });
    }, [conversation, onSetupComplete, setConversation]);

    // Create EuiCommentProps[] from conversation messages
    const commentBody = useCallback(
      (message: Message, index: number, length: number) => {
        // If timestamp is not set, set it to current time (will update conversation at end of setup)
        if (conversation.messages[index].timestamp.length === 0) {
          conversation.messages[index].timestamp = new Date().toLocaleString();
        }
        const isLastMessage = index === length - 1;
        const enableStreaming =
          (message.presentation?.stream ?? false) && currentMessageIndex !== length - 1;
        return (
          <StreamingText
            text={message.content}
            delay={enableStreaming ? 50 : 0}
            onStreamingComplete={
              isLastMessage
                ? onHandleLastMessageStreamingComplete
                : onHandleMessageStreamingComplete
            }
          >
            {(streamedText, isStreamingComplete) => (
              <EuiText>
                <EuiMarkdownFormat className={`message-${index}`}>{streamedText}</EuiMarkdownFormat>
                {isLastMessage && isStreamingComplete && <span ref={lastCommentRef} />}
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

    return (
      <>
        <CommentsContainer className="eui-scrollBar">
          <StyledCommentList
            comments={conversation.messages
              .slice(0, currentMessageIndex + 1)
              .map((message, index) => {
                const isUser = message.role === 'user';

                const commentProps: EuiCommentProps = {
                  username: isUser ? userName : assistantName,
                  children: commentBody(message, index, conversation.messages.length),
                  timelineAvatar: (
                    <EuiAvatar
                      name={i18n.CONNECTOR_SETUP_USER_ASSISTANT}
                      size="l"
                      color="subdued"
                      iconType={conversation?.theme?.assistant?.icon ?? 'logoElastic'}
                    />
                  ),
                  timestamp: `${i18n.CONNECTOR_SETUP_TIMESTAMP_AT}: ${message.timestamp}`,
                };
                return commentProps;
              })}
          />
          <div ref={bottomRef} />
        </CommentsContainer>
        {(showAddConnectorButton || isConnectorConfigured) && (
          <ConnectorButtonWrapper>
            <ConnectorButton
              setIsConnectorModalVisible={setIsConnectorModalVisible}
              connectorAdded={isConnectorConfigured}
            />
          </ConnectorButtonWrapper>
        )}
        {!showAddConnectorButton && (
          <SkipEuiText color="subdued" size={'xs'}>
            <EuiTextAlign textAlign="center">
              <EuiBadge color="hollow" isDisabled={true}>
                {i18n.CONNECTOR_SETUP_SKIP}
              </EuiBadge>
            </EuiTextAlign>
          </SkipEuiText>
        )}

        {isConnectorModalVisible && (
          <ConnectorAddModal
            actionType={actionType}
            onClose={() => setIsConnectorModalVisible(false)}
            postSaveEventHandler={(savedAction: ActionConnector) => {
              // Add connector to all conversations
              Object.values(conversations).forEach((c) => {
                setApiConfig({
                  conversationId: c.id,
                  apiConfig: {
                    ...c.apiConfig,
                    connectorId: savedAction.id,
                    provider: (savedAction as ActionConnectorProps<Config, unknown>)?.config
                      .apiProvider as OpenAiProviderType,
                  },
                });
              });

              refetchConnectors?.();
              setIsConnectorModalVisible(false);
              appendMessage({
                conversationId: conversation.id,
                message: {
                  role: 'assistant',
                  content: 'Connector setup complete!',
                  timestamp: '',
                },
              });
            }}
            actionTypeRegistry={actionTypeRegistry}
          />
        )}
      </>
    );
  }
);
ConnectorSetup.displayName = 'ConnectorSetup';
