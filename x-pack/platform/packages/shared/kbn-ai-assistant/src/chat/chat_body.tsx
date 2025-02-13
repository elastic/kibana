/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  euiCanAnimate,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  euiScrollBarStyles,
  EuiSpacer,
  useEuiTheme,
  UseEuiTheme,
} from '@elastic/eui';
import { css, keyframes } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import type { Conversation, Message } from '@kbn/observability-ai-assistant-plugin/common';
import {
  ChatActionClickType,
  ChatState,
  MessageRole,
  ObservabilityAIAssistantTelemetryEventType,
  VisualizeESQLUserIntention,
  type ChatActionClickPayload,
  type Feedback,
  aiAssistantSimulatedFunctionCalling,
} from '@kbn/observability-ai-assistant-plugin/public';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { findLastIndex } from 'lodash';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { UseKnowledgeBaseResult } from '../hooks/use_knowledge_base';
import { ASSISTANT_SETUP_TITLE, EMPTY_CONVERSATION_TITLE, UPGRADE_LICENSE_TITLE } from '../i18n';
import { useAIAssistantChatService } from '../hooks/use_ai_assistant_chat_service';
import { useGenAIConnectors } from '../hooks/use_genai_connectors';
import { useConversation } from '../hooks/use_conversation';
import { FlyoutPositionMode } from './chat_flyout';
import { ChatHeader } from './chat_header';
import { ChatTimeline } from './chat_timeline';
import { IncorrectLicensePanel } from './incorrect_license_panel';
import { SimulatedFunctionCallingCallout } from './simulated_function_calling_callout';
import { WelcomeMessage } from './welcome_message';
import { useLicense } from '../hooks/use_license';
import { PromptEditor } from '../prompt_editor/prompt_editor';
import { deserializeMessage } from '../utils/deserialize_message';
import { useKibana } from '../hooks/use_kibana';

const fullHeightClassName = css`
  height: 100%;
`;

const timelineClassName = (scrollBarStyles: string) => css`
  overflow-y: auto;
  ${scrollBarStyles}
`;

const promptEditorClassname = (euiTheme: UseEuiTheme['euiTheme']) => css`
  overflow: hidden;
  ${euiCanAnimate} {
    transition: height ${euiTheme.animation.fast} ${euiTheme.animation.resistance};
  }
`;

const incorrectLicenseContainer = (euiTheme: UseEuiTheme['euiTheme']) => css`
  height: 100%;
  padding: ${euiTheme.size.base};
`;

const chatBodyContainerClassNameWithError = css`
  align-self: center;
`;

const promptEditorContainerClassName = css`
  padding-top: 12px;
  padding-bottom: 8px;
`;

const fadeInAnimation = keyframes`
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

const animClassName = (euiTheme: UseEuiTheme['euiTheme']) => css`
  height: 100%;
  opacity: 0;
  ${euiCanAnimate} {
    animation: ${fadeInAnimation} ${euiTheme.animation.normal} ${euiTheme.animation.bounce}
      ${euiTheme.animation.normal} forwards;
  }
`;

const containerClassName = css`
  min-width: 0;
  max-height: 100%;
`;

const PADDING_AND_BORDER = 32;

export function ChatBody({
  connectors,
  currentUser,
  flyoutPositionMode,
  initialConversationId,
  initialMessages,
  initialTitle,
  knowledgeBase,
  showLinkToConversationsApp,
  onConversationUpdate,
  onToggleFlyoutPositionMode,
  navigateToConversation,
}: {
  connectors: ReturnType<typeof useGenAIConnectors>;
  currentUser?: Pick<AuthenticatedUser, 'full_name' | 'username'>;
  flyoutPositionMode?: FlyoutPositionMode;
  initialTitle?: string;
  initialMessages?: Message[];
  initialConversationId?: string;
  knowledgeBase: UseKnowledgeBaseResult;
  showLinkToConversationsApp: boolean;
  onConversationUpdate: (conversation: { conversation: Conversation['conversation'] }) => void;
  onToggleFlyoutPositionMode?: (flyoutPositionMode: FlyoutPositionMode) => void;
  navigateToConversation?: (conversationId?: string) => void;
}) {
  const license = useLicense();
  const hasCorrectLicense = license?.hasAtLeast('enterprise');
  const theme = useEuiTheme();
  const scrollBarStyles = euiScrollBarStyles(theme);
  const { euiTheme } = theme;

  const chatService = useAIAssistantChatService();

  const {
    services: { uiSettings },
  } = useKibana();

  const simulateFunctionCalling = uiSettings!.get<boolean>(
    aiAssistantSimulatedFunctionCalling,
    false
  );

  const { conversation, messages, next, state, stop, saveTitle } = useConversation({
    initialConversationId,
    initialMessages,
    initialTitle,
    chatService,
    connectorId: connectors.selectedConnector,
    onConversationUpdate,
  });

  const timelineContainerRef = useRef<HTMLDivElement | null>(null);

  let footer: React.ReactNode;

  const isLoading = Boolean(
    connectors.loading ||
      knowledgeBase.status.loading ||
      state === ChatState.Loading ||
      conversation.loading
  );

  let title = conversation.value?.conversation.title || initialTitle;

  if (!title) {
    if (!connectors.selectedConnector) {
      title = ASSISTANT_SETUP_TITLE;
    } else if (!hasCorrectLicense && !initialConversationId) {
      title = UPGRADE_LICENSE_TITLE;
    } else {
      title = EMPTY_CONVERSATION_TITLE;
    }
  }

  const headerContainerClassName = css`
    padding-right: ${showLinkToConversationsApp ? '32px' : '0'};
  `;

  const [stickToBottom, setStickToBottom] = useState(true);

  const isAtBottom = (parent: HTMLElement) =>
    parent.scrollTop + parent.clientHeight >= parent.scrollHeight;

  const [promptEditorHeight, setPromptEditorHeight] = useState<number>(0);

  const handleFeedback = (feedback: Feedback) => {
    if (conversation.value?.conversation && 'user' in conversation.value) {
      const {
        messages: _removedMessages, // Exclude messages
        conversation: { title: _removedTitle, ...conversationRest }, // Exclude title
        ...rest
      } = conversation.value;

      const conversationWithoutMessagesAndTitle = {
        ...rest,
        conversation: conversationRest,
      };

      chatService.sendAnalyticsEvent({
        type: ObservabilityAIAssistantTelemetryEventType.ChatFeedback,
        payload: {
          feedback,
          conversation: conversationWithoutMessagesAndTitle,
        },
      });
    }
  };

  const handleChangeHeight = useCallback((editorHeight: number) => {
    if (editorHeight === 0) {
      setPromptEditorHeight(0);
    } else {
      setPromptEditorHeight(editorHeight + PADDING_AND_BORDER);
    }
  }, []);

  useEffect(() => {
    const parent = timelineContainerRef.current?.parentElement;
    if (!parent) {
      return;
    }

    function onScroll() {
      setStickToBottom(isAtBottom(parent!));
    }

    parent.addEventListener('scroll', onScroll);

    return () => {
      parent.removeEventListener('scroll', onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timelineContainerRef.current]);

  useEffect(() => {
    const parent = timelineContainerRef.current?.parentElement;
    if (!parent) {
      return;
    }

    if (stickToBottom) {
      parent.scrollTop = parent.scrollHeight;
    }
  });

  const handleCopyConversation = () => {
    const deserializedMessages = (conversation.value?.messages ?? messages).map(deserializeMessage);

    const content = JSON.stringify({
      title: initialTitle,
      messages: deserializedMessages,
    });

    navigator.clipboard?.writeText(content || '');
  };

  const handleActionClick = ({
    message,
    payload,
  }: {
    message: Message;
    payload: ChatActionClickPayload;
  }) => {
    setStickToBottom(true);
    switch (payload.type) {
      case ChatActionClickType.executeEsqlQuery:
        next(
          messages.concat({
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.Assistant,
              content: '',
              function_call: {
                name: 'execute_query',
                arguments: JSON.stringify({
                  query: payload.query,
                }),
                trigger: MessageRole.User,
              },
            },
          })
        );
        break;

      case ChatActionClickType.updateVisualization:
        const visualizeQueryResponse = message;

        const visualizeQueryResponseData = JSON.parse(visualizeQueryResponse.message.data ?? '{}');

        next(
          messages.slice(0, messages.indexOf(visualizeQueryResponse)).concat({
            '@timestamp': new Date().toISOString(),
            message: {
              name: 'visualize_query',
              content: visualizeQueryResponse.message.content,
              data: JSON.stringify({
                ...visualizeQueryResponseData,
                userOverrides: payload.userOverrides,
              }),
              role: MessageRole.User,
            },
          })
        );
        break;
      case ChatActionClickType.visualizeEsqlQuery:
        next(
          messages.concat({
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.Assistant,
              content: '',
              function_call: {
                name: 'visualize_query',
                arguments: JSON.stringify({
                  query: payload.query,
                  intention: VisualizeESQLUserIntention.visualizeAuto,
                }),
                trigger: MessageRole.User,
              },
            },
          })
        );
        break;
    }
  };

  if (!hasCorrectLicense && !initialConversationId) {
    footer = (
      <>
        <EuiFlexItem grow className={incorrectLicenseContainer(euiTheme)}>
          <IncorrectLicensePanel />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiHorizontalRule margin="none" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPanel hasBorder={false} hasShadow={false} paddingSize="m">
            <PromptEditor
              hidden={connectors.loading || connectors.connectors?.length === 0}
              loading={isLoading}
              disabled
              onChangeHeight={setPromptEditorHeight}
              onSubmit={(message) => {
                next(messages.concat(message));
              }}
              onSendTelemetry={(eventWithPayload) =>
                chatService.sendAnalyticsEvent(eventWithPayload)
              }
            />
            <EuiSpacer size="s" />
          </EuiPanel>
        </EuiFlexItem>
      </>
    );
  } else if (!conversation.value && conversation.loading) {
    footer = null;
  } else {
    footer = (
      <>
        <EuiFlexItem grow className={timelineClassName(scrollBarStyles)}>
          <div ref={timelineContainerRef} className={fullHeightClassName}>
            <EuiPanel
              grow
              hasBorder={false}
              hasShadow={false}
              paddingSize="m"
              className={animClassName(euiTheme)}
            >
              {connectors.connectors?.length === 0 || messages.length === 1 ? (
                <WelcomeMessage
                  connectors={connectors}
                  knowledgeBase={knowledgeBase}
                  onSelectPrompt={(message) =>
                    next(
                      messages.concat([
                        {
                          '@timestamp': new Date().toISOString(),
                          message: { content: message, role: MessageRole.User },
                        },
                      ])
                    )
                  }
                />
              ) : (
                <ChatTimeline
                  messages={messages}
                  knowledgeBase={knowledgeBase}
                  chatService={chatService}
                  currentUser={currentUser}
                  chatState={state}
                  hasConnector={!!connectors.connectors?.length}
                  onEdit={(editedMessage, newMessage) => {
                    setStickToBottom(true);
                    const indexOf = messages.indexOf(editedMessage);
                    next(messages.slice(0, indexOf).concat(newMessage));
                  }}
                  onFeedback={handleFeedback}
                  onRegenerate={(message) => {
                    next(reverseToLastUserMessage(messages, message));
                  }}
                  onSendTelemetry={(eventWithPayload) =>
                    chatService.sendAnalyticsEvent(eventWithPayload)
                  }
                  onStopGenerating={stop}
                  onActionClick={handleActionClick}
                />
              )}
            </EuiPanel>
          </div>
        </EuiFlexItem>

        {simulateFunctionCalling ? (
          <EuiFlexItem grow={false}>
            <SimulatedFunctionCallingCallout />
          </EuiFlexItem>
        ) : null}

        <EuiFlexItem
          grow={false}
          className={promptEditorClassname(euiTheme)}
          style={{ height: promptEditorHeight }}
        >
          <EuiHorizontalRule margin="none" />
          <EuiPanel
            hasBorder={false}
            hasShadow={false}
            paddingSize="m"
            color="subdued"
            className={promptEditorContainerClassName}
          >
            <PromptEditor
              disabled={!connectors.selectedConnector || !hasCorrectLicense}
              hidden={connectors.loading || connectors.connectors?.length === 0}
              loading={isLoading}
              onChangeHeight={handleChangeHeight}
              onSendTelemetry={(eventWithPayload) =>
                chatService.sendAnalyticsEvent(eventWithPayload)
              }
              onSubmit={(message) => {
                setStickToBottom(true);
                return next(messages.concat(message));
              }}
            />
            <EuiSpacer size="s" />
          </EuiPanel>
        </EuiFlexItem>
      </>
    );
  }

  if (conversation.error) {
    return (
      <EuiFlexGroup
        direction="column"
        className={containerClassName}
        gutterSize="none"
        justifyContent="center"
        responsive={false}
      >
        <EuiFlexItem grow={false} className={chatBodyContainerClassNameWithError}>
          <EuiCallOut
            color="danger"
            title={i18n.translate('xpack.aiAssistant.couldNotFindConversationTitle', {
              defaultMessage: 'Conversation not found',
            })}
            iconType="warning"
          >
            {i18n.translate('xpack.aiAssistant.couldNotFindConversationContent', {
              defaultMessage:
                'Could not find a conversation with id {conversationId}. Make sure the conversation exists and you have access to it.',
              values: { conversationId: initialConversationId },
            })}
          </EuiCallOut>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      className={containerClassName}
      responsive={false}
    >
      <EuiFlexItem
        grow={false}
        className={conversation.error ? chatBodyContainerClassNameWithError : undefined}
      >
        {conversation.error ? (
          <EuiCallOut
            color="danger"
            title={i18n.translate('xpack.aiAssistant.couldNotFindConversationTitle', {
              defaultMessage: 'Conversation not found',
            })}
            iconType="warning"
          >
            {i18n.translate('xpack.aiAssistant.couldNotFindConversationContent', {
              defaultMessage:
                'Could not find a conversation with id {conversationId}. Make sure the conversation exists and you have access to it.',
              values: { conversationId: initialConversationId },
            })}
          </EuiCallOut>
        ) : null}
      </EuiFlexItem>
      <EuiFlexItem grow={false} className={headerContainerClassName}>
        <ChatHeader
          connectors={connectors}
          conversationId={
            conversation.value?.conversation && 'id' in conversation.value.conversation
              ? conversation.value.conversation.id
              : undefined
          }
          flyoutPositionMode={flyoutPositionMode}
          licenseInvalid={!hasCorrectLicense && !initialConversationId}
          loading={isLoading}
          title={title}
          onCopyConversation={handleCopyConversation}
          onSaveTitle={(newTitle) => {
            saveTitle(newTitle);
          }}
          onToggleFlyoutPositionMode={onToggleFlyoutPositionMode}
          navigateToConversation={
            initialMessages?.length && !initialConversationId ? undefined : navigateToConversation
          }
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiHorizontalRule margin="none" />
      </EuiFlexItem>
      {footer}
    </EuiFlexGroup>
  );
}

// Exported for testing only
export function reverseToLastUserMessage(messages: Message[], message: Message) {
  // Drop messages after and including the one marked for regeneration
  const indexOf = messages.indexOf(message);
  const previousMessages = messages.slice(0, indexOf);

  // Go back to the last written user message to fully regenerate function calls
  const lastUserMessageIndex = findLastIndex(
    previousMessages,
    (aMessage: Message) => aMessage.message.role === 'user' && !aMessage.message.name
  );
  const nextMessages = previousMessages.slice(0, lastUserMessageIndex + 1);

  return nextMessages;
}
