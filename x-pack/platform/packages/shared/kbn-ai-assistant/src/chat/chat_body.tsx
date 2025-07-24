/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
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
import type {
  Conversation,
  ConversationAccess,
  Message,
} from '@kbn/observability-ai-assistant-plugin/common';
import {
  ChatActionClickType,
  ChatState,
  MessageRole,
  ObservabilityAIAssistantTelemetryEventType,
  VisualizeESQLUserIntention,
  type ChatActionClickPayload,
  type Feedback,
  aiAssistantSimulatedFunctionCalling,
  getElasticManagedLlmConnector,
  KnowledgeBaseState,
} from '@kbn/observability-ai-assistant-plugin/public';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { findLastIndex } from 'lodash';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChatFeedback } from '@kbn/observability-ai-assistant-plugin/public/analytics/schemas/chat_feedback';
import type { UseKnowledgeBaseResult } from '../hooks/use_knowledge_base';
import { ASSISTANT_SETUP_TITLE, EMPTY_CONVERSATION_TITLE, UPGRADE_LICENSE_TITLE } from '../i18n';
import { useAIAssistantChatService } from '../hooks/use_ai_assistant_chat_service';
import { useGenAIConnectors } from '../hooks/use_genai_connectors';
import { useConversation } from '../hooks/use_conversation';
import { useElasticLlmCalloutsStatus } from '../hooks/use_elastic_llm_callouts_status';
import { FlyoutPositionMode } from './chat_flyout';
import { ChatHeader } from './chat_header';
import { ChatTimeline } from './chat_timeline';
import { IncorrectLicensePanel } from './incorrect_license_panel';
import { SimulatedFunctionCallingCallout } from './simulated_function_calling_callout';
import { WelcomeMessage } from './welcome_message';
import { useLicense } from '../hooks/use_license';
import { PromptEditor } from '../prompt_editor/prompt_editor';
import { useKibana } from '../hooks/use_kibana';
import { ChatBanner } from './chat_banner';
import { useConversationContextMenu } from '../hooks';

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
  margin: 12px;
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
  ${euiCanAnimate} {
    opacity: 0;
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
  setIsUpdatingConversationList,
  refreshConversations,
  updateDisplayedConversation,
  onConversationDuplicate,
}: {
  connectors: ReturnType<typeof useGenAIConnectors>;
  currentUser?: Pick<AuthenticatedUser, 'full_name' | 'username' | 'profile_uid'>;
  flyoutPositionMode?: FlyoutPositionMode;
  initialTitle?: string;
  initialMessages?: Message[];
  initialConversationId?: string;
  knowledgeBase: UseKnowledgeBaseResult;
  showLinkToConversationsApp: boolean;
  onConversationUpdate: (conversation: { conversation: Conversation['conversation'] }) => void;
  onConversationDuplicate: (conversation: Conversation) => void;
  onToggleFlyoutPositionMode?: (flyoutPositionMode: FlyoutPositionMode) => void;
  navigateToConversation?: (conversationId?: string) => void;
  setIsUpdatingConversationList: (isUpdating: boolean) => void;
  refreshConversations: () => void;
  updateDisplayedConversation: (id?: string) => void;
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

  const {
    conversation,
    conversationId,
    messages,
    next,
    state,
    stop,
    saveTitle,
    duplicateConversation,
    isConversationOwnedByCurrentUser,
    user: conversationUser,
    updateConversationAccess,
  } = useConversation({
    currentUser,
    initialConversationId,
    initialMessages,
    initialTitle,
    chatService,
    connectorId: connectors.selectedConnector,
    onConversationUpdate,
    onConversationDuplicate,
  });

  const timelineContainerRef = useRef<HTMLDivElement | null>(null);

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
        systemMessage: _removedSystemMessage, // Exclude systemMessage
        conversation: { title: _removedTitle, id, last_updated: lastUpdated }, // Exclude title
        user,
        labels,
        numeric_labels: numericLabels,
        namespace,
        public: isPublic,
        '@timestamp': timestamp,
        archived,
      } = conversation.value;

      const conversationWithoutMessagesAndTitle: ChatFeedback['conversation'] = {
        '@timestamp': timestamp,
        user,
        labels,
        numeric_labels: numericLabels,
        namespace,
        public: isPublic,
        archived,
        conversation: { id, last_updated: lastUpdated },
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

  const handleActionClick = useCallback(
    ({ message, payload }: { message: Message; payload: ChatActionClickPayload }) => {
      setStickToBottom(true);
      switch (payload.type) {
        case ChatActionClickType.executeEsqlQuery: {
          const now = new Date().toISOString();
          next(
            messages.concat([
              {
                '@timestamp': now,
                message: {
                  role: MessageRole.User,
                  content: `Display results for the following ES|QL query:\n\n\`\`\`esql\n${payload.query}\n\`\`\``,
                },
              },
              {
                '@timestamp': now,
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
              },
            ])
          );
          break;
        }

        case ChatActionClickType.updateVisualization:
          const visualizeQueryResponse = message;

          const visualizeQueryResponseData = JSON.parse(
            visualizeQueryResponse.message.data ?? '{}'
          );

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
        case ChatActionClickType.visualizeEsqlQuery: {
          const now = new Date().toISOString();
          next(
            messages.concat([
              {
                '@timestamp': now,
                message: {
                  role: MessageRole.User,
                  content: `Visualize the following ES|QL query:\n\n\`\`\`esql\n${payload.query}\n\`\`\``,
                },
              },
              {
                '@timestamp': now,
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
              },
            ])
          );
          break;
        }
      }
    },
    [messages, next]
  );

  const handleConversationAccessUpdate = async (access: ConversationAccess) => {
    await updateConversationAccess(access);
    conversation.refresh();
    refreshConversations();
  };

  const { copyConversationToClipboard, copyUrl, deleteConversation, archiveConversation } =
    useConversationContextMenu({
      setIsUpdatingConversationList,
      refreshConversations,
    });

  const handleArchiveConversation = async (id: string, isArchived: boolean) => {
    await archiveConversation(id, isArchived);
    conversation.refresh();
  };

  const elasticManagedLlm = getElasticManagedLlmConnector(connectors.connectors);
  const { conversationCalloutDismissed, tourCalloutDismissed } = useElasticLlmCalloutsStatus(false);

  const showElasticLlmCalloutInChat =
    !!elasticManagedLlm &&
    connectors.selectedConnector === elasticManagedLlm.id &&
    !conversationCalloutDismissed &&
    tourCalloutDismissed;

  const showKnowledgeBaseReIndexingCallout =
    knowledgeBase.status.value?.enabled === true &&
    knowledgeBase.status.value?.kbState === KnowledgeBaseState.READY &&
    knowledgeBase.status.value?.isReIndexing === true;

  const isPublic = conversation.value?.public;
  const isArchived = !!conversation.value?.archived;
  const showPromptEditor = !isArchived && (!isPublic || isConversationOwnedByCurrentUser);

  const sharedBannerTitle = i18n.translate('xpack.aiAssistant.shareBanner.title', {
    defaultMessage: 'This conversation is shared with your team.',
  });
  const viewerDescription = i18n.translate('xpack.aiAssistant.banner.viewerDescription', {
    defaultMessage:
      "You can't edit or continue this conversation, but you can duplicate it into a new private conversation. The original conversation will remain unchanged.",
  });
  const duplicateButton = i18n.translate('xpack.aiAssistant.duplicateButton', {
    defaultMessage: 'Duplicate',
  });

  let sharedBanner = null;

  if (isPublic && !isConversationOwnedByCurrentUser) {
    sharedBanner = (
      <ChatBanner
        title={sharedBannerTitle}
        description={viewerDescription}
        button={
          <EuiButton onClick={duplicateConversation} iconType="copy" size="s">
            {duplicateButton}
          </EuiButton>
        }
      />
    );
  } else if (isConversationOwnedByCurrentUser && isPublic) {
    sharedBanner = (
      <ChatBanner
        title={sharedBannerTitle}
        description={i18n.translate('xpack.aiAssistant.shareBanner.ownerDescription', {
          defaultMessage:
            'Any further edits you do to this conversation will be shared with the rest of the team.',
        })}
      />
    );
  }

  let archivedBanner = null;
  const archivedBannerTitle = i18n.translate('xpack.aiAssistant.archivedBanner.title', {
    defaultMessage: 'This conversation has been archived.',
  });

  if (isConversationOwnedByCurrentUser) {
    archivedBanner = (
      <ChatBanner
        title={archivedBannerTitle}
        icon="folderOpen"
        description={i18n.translate('xpack.aiAssistant.archivedBanner.ownerDescription', {
          defaultMessage:
            "You can't edit or continue this conversation as it's been archived, but you can unarchive it.",
        })}
        button={
          <EuiButton
            onClick={() => handleArchiveConversation(conversationId!, !isArchived)}
            iconType="folderOpen"
            size="s"
          >
            {i18n.translate('xpack.aiAssistant.unarchiveButton', {
              defaultMessage: 'Unarchive',
            })}
          </EuiButton>
        }
      />
    );
  } else {
    archivedBanner = (
      <ChatBanner
        title={archivedBannerTitle}
        icon="folderOpen"
        description={viewerDescription}
        button={
          <EuiButton onClick={duplicateConversation} iconType="copy" size="s">
            {duplicateButton}
          </EuiButton>
        }
      />
    );
  }

  let footer: React.ReactNode;
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
              {connectors.connectors?.length === 0 || messages.length === 0 ? (
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
                  showElasticLlmCalloutInChat={showElasticLlmCalloutInChat}
                  showKnowledgeBaseReIndexingCallout={showKnowledgeBaseReIndexingCallout}
                />
              ) : (
                <ChatTimeline
                  conversationId={conversationId}
                  messages={messages}
                  chatService={chatService}
                  currentUser={conversationUser}
                  isConversationOwnedByCurrentUser={isConversationOwnedByCurrentUser}
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
                  isArchived={isArchived}
                  showElasticLlmCalloutInChat={showElasticLlmCalloutInChat}
                  showKnowledgeBaseReIndexingCallout={showKnowledgeBaseReIndexingCallout}
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

        <>
          {conversationId && !isArchived ? sharedBanner : null}
          {conversationId && isArchived ? archivedBanner : null}
          {showPromptEditor ? (
            <EuiFlexItem
              grow={false}
              className={promptEditorClassname(euiTheme)}
              css={{ height: promptEditorHeight }}
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
          ) : null}
        </>
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
          conversationId={conversationId}
          conversation={conversation.value as Conversation}
          flyoutPositionMode={flyoutPositionMode}
          licenseInvalid={!hasCorrectLicense && !initialConversationId}
          loading={isLoading}
          title={title}
          onDuplicateConversation={duplicateConversation}
          onSaveTitle={(newTitle) => {
            saveTitle(newTitle);
          }}
          onToggleFlyoutPositionMode={onToggleFlyoutPositionMode}
          navigateToConversation={
            initialMessages?.length && !initialConversationId ? undefined : navigateToConversation
          }
          updateDisplayedConversation={updateDisplayedConversation}
          handleConversationAccessUpdate={handleConversationAccessUpdate}
          isConversationOwnedByCurrentUser={isConversationOwnedByCurrentUser}
          copyConversationToClipboard={copyConversationToClipboard}
          copyUrl={copyUrl}
          deleteConversation={deleteConversation}
          handleArchiveConversation={handleArchiveConversation}
          isConversationApp={!showLinkToConversationsApp}
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
