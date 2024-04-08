/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiCommentList,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalBody,
  EuiText,
} from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { createPortal } from 'react-dom';
import { css } from '@emotion/react';
import styled from '@emotion/styled';

import { find, isEmpty } from 'lodash';
import { useChatSend } from './chat_send/use_chat_send';
import { ChatSend } from './chat_send';
import { BlockBotCallToAction } from './block_bot/cta';
import { AssistantHeader } from './assistant_header';
import { WELCOME_CONVERSATION_TITLE } from './use_conversation/translations';
import {
  getDefaultConnector,
  getBlockBotConversation,
  mergeBaseWithPersistedConversations,
} from './helpers';

import { useAssistantContext, UserAvatar } from '../assistant_context';
import { ContextPills } from './context_pills';
import { getNewSelectedPromptContext } from '../data_anonymization/get_new_selected_prompt_context';
import type { PromptContext, SelectedPromptContext } from './prompt_context/types';
import { useConversation } from './use_conversation';
import { CodeBlockDetails, getDefaultSystemPrompt } from './use_conversation/helpers';
import { PromptEditor } from './prompt_editor';
import { QuickPrompts } from './quick_prompts/quick_prompts';
import { useLoadConnectors } from '../connectorland/use_load_connectors';
import { useConnectorSetup } from '../connectorland/connector_setup';
import { ConnectorMissingCallout } from '../connectorland/connector_missing_callout';
import { ConversationSidePanel } from './conversations/conversation_sidepanel';
import { NEW_CHAT } from './conversations/conversation_sidepanel/translations';
import { SystemPrompt } from './prompt_editor/system_prompt';
import { SelectedPromptContexts } from './prompt_editor/selected_prompt_contexts';
import { AssistantHeaderFlyout } from './assistant_header/assistant_header_flyout';
import * as i18n from './translations';

export const CONVERSATION_SIDE_PANEL_WIDTH = 220;

const CommentContainer = styled('span')`
  display: flex;
  flex: 1;
  overflow: hidden;
`;

const ModalPromptEditorWrapper = styled.div`
  margin-right: 24px;
`;

import {
  FetchConversationsResponse,
  useFetchCurrentUserConversations,
} from './api/conversations/use_fetch_current_user_conversations';
import { Conversation } from '../assistant_context/types';
import { clearPresentationData } from '../connectorland/connector_setup/helpers';
import { getGenAiConfig } from '../connectorland/helpers';
import { AssistantAnimatedIcon } from './assistant_animated_icon';

export interface Props {
  conversationTitle?: string;
  embeddedLayout?: boolean;
  promptContextId?: string;
  shouldRefocusPrompt?: boolean;
  showTitle?: boolean;
  setConversationTitle?: Dispatch<SetStateAction<string>>;
  onCloseFlyout?: () => void;
  isFlyoutMode?: boolean;
  chatHistoryVisible?: boolean;
  setChatHistoryVisible?: Dispatch<SetStateAction<boolean>>;
  currentUserAvatar?: UserAvatar;
}

/**
 * Renders a chat window with a prompt input and a chat history, along with
 * quick prompts for common actions, settings, and prompt context providers.
 */
const AssistantComponent: React.FC<Props> = ({
  conversationTitle,
  embeddedLayout = false,
  promptContextId = '',
  shouldRefocusPrompt = false,
  showTitle = true,
  setConversationTitle,
  onCloseFlyout,
  isFlyoutMode = false,
  chatHistoryVisible,
  setChatHistoryVisible,
  currentUserAvatar,
}) => {
  const {
    assistantTelemetry,
    augmentMessageCodeBlocks,
    assistantAvailability: { isAssistantEnabled },
    defaultAllow,
    defaultAllowReplacement,
    docLinks,
    getComments,
    http,
    knowledgeBase: { isEnabledKnowledgeBase, isEnabledRAGAlerts },
    promptContexts,
    setLastConversationId,
    getLastConversationId,
    title,
    allSystemPrompts,
    baseConversations,
  } = useAssistantContext();

  const {
    getDefaultConversation,
    getConversation,
    deleteConversation,
    setApiConfig,
    createConversation,
  } = useConversation();

  const [selectedPromptContexts, setSelectedPromptContexts] = useState<
    Record<string, SelectedPromptContext>
  >({});

  const selectedPromptContextsCount = useMemo(
    () => Object.keys(selectedPromptContexts).length,
    [selectedPromptContexts]
  );

  const onFetchedConversations = useCallback(
    (conversationsData: FetchConversationsResponse): Record<string, Conversation> =>
      mergeBaseWithPersistedConversations(baseConversations, conversationsData),
    [baseConversations]
  );
  const [isStreaming, setIsStreaming] = useState(false);

  const {
    data: conversations,
    isLoading,
    refetch: refetchResults,
    isSuccess: conversationsLoaded,
  } = useFetchCurrentUserConversations({
    http,
    onFetch: onFetchedConversations,
    refetchOnWindowFocus: !isStreaming,
  });

  // Connector details
  const { data: connectors, isSuccess: areConnectorsFetched } = useLoadConnectors({
    http,
  });
  const defaultConnector = useMemo(() => getDefaultConnector(connectors), [connectors]);

  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>();

  const [currentConversation, setCurrentConversation] = useState<Conversation | undefined>();

  useEffect(() => {
    if (setConversationTitle && currentConversation?.title) {
      setConversationTitle(currentConversation?.title);
    }
  }, [currentConversation?.title, setConversationTitle]);

  const refetchCurrentConversation = useCallback(
    async ({ cId, cTitle }: { cId?: string; cTitle?: string } = {}) => {
      if (cId === '' || (cTitle && !conversations[cTitle])) {
        return;
      }

      const conversationId = cId ?? (cTitle && conversations[cTitle].id) ?? currentConversation?.id;

      if (conversationId) {
        const updatedConversation = await getConversation(conversationId);

        return updatedConversation;
      }
    },
    [conversations, currentConversation?.id, getConversation]
  );

  useEffect(() => {
    if (conversationsLoaded && Object.keys(conversations).length > 0) {
      setCurrentConversation((prev) => {
        const nextConversation =
          (currentConversationId && conversations[currentConversationId]) ||
          find(conversations, [
            'title',
            isAssistantEnabled
              ? getLastConversationId(conversationTitle)
              : WELCOME_CONVERSATION_TITLE,
          ]);

        if (nextConversation?.id !== '' && prev?.id === nextConversation?.id) return prev;

        return (
          (nextConversation &&
            conversations[
              nextConversation?.id !== '' ? nextConversation?.id : nextConversation?.title
            ]) ??
          conversations[WELCOME_CONVERSATION_TITLE] ??
          getDefaultConversation({ cTitle: WELCOME_CONVERSATION_TITLE })
        );
      });
    }
  }, [
    conversationTitle,
    conversations,
    getDefaultConversation,
    getLastConversationId,
    conversationsLoaded,
    currentConversation?.id,
    currentConversationId,
    isAssistantEnabled,
  ]);

  // Welcome setup state
  const isWelcomeSetup = useMemo(() => {
    // if any conversation has a connector id, we're not in welcome set up
    return Object.keys(conversations).some(
      (conversation) => conversations[conversation]?.apiConfig?.connectorId != null
    )
      ? false
      : (connectors?.length ?? 0) === 0;
  }, [connectors?.length, conversations]);
  const isDisabled = isWelcomeSetup || !isAssistantEnabled;

  // Welcome conversation is a special 'setup' case when no connector exists, mostly extracted to `ConnectorSetup` component,
  // but currently a bit of state is littered throughout the assistant component. TODO: clean up/isolate this state
  const blockBotConversation = useMemo(
    () => currentConversation && getBlockBotConversation(currentConversation, isAssistantEnabled),
    [currentConversation, isAssistantEnabled]
  );

  // Settings modal state (so it isn't shared between assistant instances like Timeline)
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);

  // Remember last selection for reuse after keyboard shortcut is pressed.
  // Clear it if there is no connectors
  useEffect(() => {
    if (areConnectorsFetched && !connectors?.length) {
      return setLastConversationId(WELCOME_CONVERSATION_TITLE);
    }

    if (!currentConversation?.excludeFromLastConversationStorage) {
      setLastConversationId(
        !isEmpty(currentConversation?.id) ? currentConversation?.id : currentConversation?.title
      );
    }
  }, [
    areConnectorsFetched,
    connectors?.length,
    conversations,
    currentConversation,
    isLoading,
    setLastConversationId,
  ]);

  const [promptTextPreview, setPromptTextPreview] = useState<string>('');
  const [autoPopulatedOnce, setAutoPopulatedOnce] = useState<boolean>(false);
  const [userPrompt, setUserPrompt] = useState<string | null>(null);

  const [showAnonymizedValues, setShowAnonymizedValues] = useState<boolean>(false);

  const [messageCodeBlocks, setMessageCodeBlocks] = useState<CodeBlockDetails[][]>();
  const [_, setCodeBlockControlsVisible] = useState(false);
  useLayoutEffect(() => {
    if (currentConversation) {
      // need in order for code block controls to be added to the DOM
      setTimeout(() => {
        setMessageCodeBlocks(augmentMessageCodeBlocks(currentConversation, showAnonymizedValues));
      }, 0);
    }
  }, [augmentMessageCodeBlocks, currentConversation, showAnonymizedValues]);

  // Show missing connector callout if no connectors are configured

  const showMissingConnectorCallout = useMemo(() => {
    if (!isLoading && areConnectorsFetched) {
      if (!currentConversation?.apiConfig?.connectorId) {
        return true;
      }

      return !connectors?.some(
        (connector) => connector.id === currentConversation.apiConfig?.connectorId
      );
    }

    return false;
  }, [areConnectorsFetched, connectors, currentConversation?.apiConfig?.connectorId, isLoading]);

  const isSendingDisabled = useMemo(() => {
    return isDisabled || showMissingConnectorCallout;
  }, [showMissingConnectorCallout, isDisabled]);

  // Fixes initial render not showing buttons as code block controls are added to the DOM really late
  useEffect(() => {
    const updateElements = () => {
      const elements = document.querySelectorAll('.euiCodeBlock__controls');
      setCodeBlockControlsVisible(elements.length > 0);
    };

    updateElements(); // Initial update

    const observer = new MutationObserver(updateElements);
    observer.observe(document.body, { subtree: true, childList: true });

    return () => {
      observer.disconnect(); // Clean up the observer if component unmounts
    };
  }, []);
  // End drill in `Add To Timeline` action

  // Start Scrolling
  const commentsContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const parent = commentsContainerRef.current?.parentElement;

    if (!parent) {
      return;
    }
    // when scrollHeight changes, parent is scrolled to bottom
    parent.scrollTop = parent.scrollHeight;
  });

  const getWrapper = (children: React.ReactNode, isCommentContainer: boolean) =>
    isCommentContainer ? <span ref={commentsContainerRef}>{children}</span> : <>{children}</>;

  //  End Scrolling

  const selectedSystemPrompt = useMemo(
    () => getDefaultSystemPrompt({ allSystemPrompts, conversation: currentConversation }),
    [allSystemPrompts, currentConversation]
  );

  const [editingSystemPromptId, setEditingSystemPromptId] = useState<string | undefined>(
    selectedSystemPrompt?.id
  );

  const handleOnConversationSelected = useCallback(
    async ({ cId, cTitle }: { cId: string; cTitle: string }) => {
      const updatedConv = await refetchResults();

      if (cId === '') {
        setCurrentConversationId(cTitle);
        setEditingSystemPromptId(
          getDefaultSystemPrompt({ allSystemPrompts, conversation: updatedConv?.data?.[cTitle] })
            ?.id
        );
        setCurrentConversationId(cTitle);
      } else {
        const refetchedConversation = await refetchCurrentConversation({ cId });
        setEditingSystemPromptId(
          getDefaultSystemPrompt({ allSystemPrompts, conversation: refetchedConversation })?.id
        );
        if (refetchedConversation) {
          setCurrentConversation(refetchedConversation);
        }
        setCurrentConversationId(cId);
      }
    },
    [allSystemPrompts, refetchCurrentConversation, refetchResults]
  );

  const { comments: connectorComments, prompt: connectorPrompt } = useConnectorSetup({
    isFlyoutMode,
    conversation: blockBotConversation,
    onConversationUpdate: handleOnConversationSelected,
    onSetupComplete: () => {
      if (currentConversation) {
        setCurrentConversation(clearPresentationData(currentConversation));
      }
    },
  });

  const handleOnConversationDeleted = useCallback(
    async (cTitle: string) => {
      await deleteConversation(conversations[cTitle].id);
      await refetchResults();
    },
    [conversations, deleteConversation, refetchResults]
  );

  const handleOnSystemPromptSelectionChange = useCallback((systemPromptId?: string) => {
    setEditingSystemPromptId(systemPromptId);
  }, []);

  // Add min-height to all codeblocks so timeline icon doesn't overflow
  const codeBlockContainers = [...document.getElementsByClassName('euiCodeBlock')];
  // @ts-ignore-expect-error
  codeBlockContainers.forEach((e) => (e.style.minHeight = '75px'));
  ////

  const onToggleShowAnonymizedValues = useCallback(() => {
    setShowAnonymizedValues((prevValue) => !prevValue);
  }, [setShowAnonymizedValues]);

  const isNewConversation = useMemo(
    () => currentConversation?.messages.length === 0,
    [currentConversation?.messages.length]
  );

  useEffect(() => {
    // Adding `conversationTitle !== selectedConversationTitle` to prevent auto-run still executing after changing selected conversation
    if (currentConversation?.messages.length || conversationTitle !== currentConversation?.title) {
      return;
    }

    if (autoPopulatedOnce) {
      return;
    }

    const promptContext: PromptContext | undefined = promptContexts[promptContextId];
    if (promptContext != null) {
      setAutoPopulatedOnce(true);

      if (!Object.keys(selectedPromptContexts).includes(promptContext.id)) {
        const addNewSelectedPromptContext = async () => {
          const newSelectedPromptContext = await getNewSelectedPromptContext({
            defaultAllow,
            defaultAllowReplacement,
            promptContext,
          });

          setSelectedPromptContexts((prev) => ({
            ...prev,
            [promptContext.id]: newSelectedPromptContext,
          }));
        };

        addNewSelectedPromptContext();
      }

      if (promptContext.suggestedUserPrompt != null) {
        setUserPrompt(promptContext.suggestedUserPrompt);
      }
    }
  }, [
    currentConversation?.messages,
    promptContexts,
    promptContextId,
    conversationTitle,
    currentConversation?.title,
    selectedPromptContexts,
    autoPopulatedOnce,
    defaultAllow,
    defaultAllowReplacement,
  ]);

  useEffect(() => {}, [
    areConnectorsFetched,
    connectors,
    conversationsLoaded,
    currentConversation,
    isLoading,
  ]);

  const createCodeBlockPortals = useCallback(
    () =>
      messageCodeBlocks?.map((codeBlocks: CodeBlockDetails[], i: number) => {
        return (
          <span key={`${i}`}>
            {codeBlocks.map((codeBlock: CodeBlockDetails, j: number) => {
              const getElement = codeBlock.getControlContainer;
              const element = getElement?.();
              return (
                <span key={`${i}+${j}`}>
                  {element ? createPortal(codeBlock.button, element) : <></>}
                </span>
              );
            })}
          </span>
        );
      }),
    [messageCodeBlocks]
  );

  const {
    abortStream,
    handleButtonSendMessage,
    handleOnChatCleared,
    handlePromptChange,
    handleSendMessage,
    handleRegenerateResponse,
    isLoading: isLoadingChatSend,
  } = useChatSend({
    allSystemPrompts,
    currentConversation,
    setPromptTextPreview,
    setUserPrompt,
    editingSystemPromptId,
    http,
    setEditingSystemPromptId,
    selectedPromptContexts,
    setSelectedPromptContexts,
    setCurrentConversation,
  });

  const chatbotComments = useMemo(
    () => (
      <>
        <EuiCommentList
          comments={getComments({
            abortStream,
            currentConversation,
            showAnonymizedValues,
            refetchCurrentConversation,
            regenerateMessage: handleRegenerateResponse,
            isEnabledLangChain: isEnabledKnowledgeBase || isEnabledRAGAlerts,
            isFetchingResponse: isLoadingChatSend,
            setIsStreaming,
            currentUserAvatar,
            isFlyoutMode,
          })}
          {...(!isFlyoutMode
            ? {
                css: css`
                  margin-right: 24px;
                  > li > div:nth-child(2) {
                    overflow: hidden;
                  }
                `,
              }
            : {
                // Avoid comments going off the flyout
                css: css`
                  > li > div:nth-child(2) {
                    overflow: hidden;
                  }
                `,
              })}
        />

        {currentConversation?.messages.length !== 0 && selectedPromptContextsCount > 0 && (
          <EuiSpacer size={'m'} />
        )}

        {!isFlyoutMode &&
          (currentConversation?.messages.length === 0 || selectedPromptContextsCount > 0) && (
            <ModalPromptEditorWrapper>
              <PromptEditor
                conversation={currentConversation}
                editingSystemPromptId={editingSystemPromptId}
                isNewConversation={isNewConversation}
                isSettingsModalVisible={isSettingsModalVisible}
                promptContexts={promptContexts}
                promptTextPreview={promptTextPreview}
                onSystemPromptSelectionChange={handleOnSystemPromptSelectionChange}
                selectedPromptContexts={selectedPromptContexts}
                setIsSettingsModalVisible={setIsSettingsModalVisible}
                setSelectedPromptContexts={setSelectedPromptContexts}
                isFlyoutMode={isFlyoutMode}
              />
            </ModalPromptEditorWrapper>
          )}
      </>
    ),
    [
      abortStream,
      refetchCurrentConversation,
      currentConversation,
      editingSystemPromptId,
      getComments,
      showAnonymizedValues,
      handleRegenerateResponse,
      isEnabledKnowledgeBase,
      isEnabledRAGAlerts,
      isLoadingChatSend,
      currentUserAvatar,
      isFlyoutMode,
      selectedPromptContextsCount,
      isNewConversation,
      isSettingsModalVisible,
      promptContexts,
      promptTextPreview,
      handleOnSystemPromptSelectionChange,
      selectedPromptContexts,
    ]
  );

  const comments = useMemo(() => {
    if (isDisabled && !isFlyoutMode) {
      return (
        <EuiCommentList
          comments={connectorComments}
          css={css`
            margin-right: 20px;
          `}
        />
      );
    }

    return chatbotComments;
  }, [isDisabled, isFlyoutMode, chatbotComments, connectorComments]);

  const trackPrompt = useCallback(
    (promptTitle: string) => {
      if (currentConversation?.title) {
        assistantTelemetry?.reportAssistantQuickPrompt({
          conversationId: currentConversation?.title,
          promptTitle,
        });
      }
    },
    [assistantTelemetry, currentConversation?.title]
  );

  const refetchConversationsState = useCallback(async () => {
    await refetchResults();
  }, [refetchResults]);

  useEffect(() => {
    if (
      showMissingConnectorCallout &&
      areConnectorsFetched &&
      defaultConnector &&
      currentConversation
    ) {
      const apiConfig = getGenAiConfig(defaultConnector);
      setApiConfig({
        conversation: currentConversation,
        apiConfig: {
          ...currentConversation.apiConfig,
          connectorId: defaultConnector.id,
          actionTypeId: defaultConnector.actionTypeId,
          provider: apiConfig?.apiProvider,
          model: apiConfig?.defaultModel,
        },
      }).then(() => refetchConversationsState());
    }
  }, [
    currentConversation,
    defaultConnector,
    refetchConversationsState,
    setApiConfig,
    showMissingConnectorCallout,
    areConnectorsFetched,
  ]);

  const handleCreateConversation = useCallback(async () => {
    const newChatExists = find(conversations, ['title', NEW_CHAT]);
    if (newChatExists && !newChatExists.messages.length) {
      handleOnConversationSelected({
        cId: newChatExists.id,
        cTitle: newChatExists.title,
      });
      return;
    }

    const newConversation = await createConversation({
      title: NEW_CHAT,
      apiConfig: currentConversation?.apiConfig,
    });

    await refetchConversationsState();

    if (newConversation) {
      handleOnConversationSelected({
        cId: newConversation.id,
        cTitle: newConversation.title,
      });
    }
  }, [
    conversations,
    createConversation,
    currentConversation?.apiConfig,
    handleOnConversationSelected,
    refetchConversationsState,
  ]);

  const flyoutBodyContent = useMemo(() => {
    if (isWelcomeSetup) {
      return (
        <EuiFlexGroup alignItems="center" justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiPanel
              hasShadow={false}
              css={css`
                max-width: 400px;
                text-align: center;
              `}
            >
              <EuiFlexGroup alignItems="center" justifyContent="center" direction="column">
                <EuiFlexItem grow={false}>
                  <AssistantAnimatedIcon />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText>
                    <h3>{i18n.WELCOME_SCREEN_TITLE}</h3>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText color="subdued">
                    <p>{i18n.WELCOME_SCREEN_DESCRIPTION}</p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false} data-test-subj="connector-prompt">
                  {connectorPrompt}
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    if (currentConversation?.messages.length === 0) {
      return (
        <EuiFlexGroup alignItems="center" justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiPanel
              hasShadow={false}
              css={css`
                max-width: 400px;
                text-align: center;
              `}
            >
              <EuiFlexGroup alignItems="center" justifyContent="center" direction="column">
                <EuiFlexItem grow={false}>
                  <AssistantAnimatedIcon />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText>
                    <h3>{i18n.EMPTY_SCREEN_TITLE}</h3>
                    <p>{i18n.EMPTY_SCREEN_DESCRIPTION}</p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <SystemPrompt
                    conversation={currentConversation}
                    editingSystemPromptId={editingSystemPromptId}
                    onSystemPromptSelectionChange={handleOnSystemPromptSelectionChange}
                    isSettingsModalVisible={isSettingsModalVisible}
                    setIsSettingsModalVisible={setIsSettingsModalVisible}
                    isFlyoutMode
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    return (
      <EuiPanel
        hasShadow={false}
        panelRef={(element) => {
          commentsContainerRef.current = (element?.parentElement as HTMLDivElement) || null;
        }}
      >
        {comments}
      </EuiPanel>
    );
  }, [
    comments,
    connectorPrompt,
    currentConversation,
    editingSystemPromptId,
    handleOnSystemPromptSelectionChange,
    isSettingsModalVisible,
    isWelcomeSetup,
  ]);

  if (isFlyoutMode) {
    return (
      <EuiFlexGroup direction={'row'} wrap={false} gutterSize="none">
        {chatHistoryVisible && (
          <EuiFlexItem
            grow={false}
            css={css`
              inline-size: ${CONVERSATION_SIDE_PANEL_WIDTH}px;
              border-right: 1px solid ${euiThemeVars.euiColorLightShade};
            `}
          >
            <ConversationSidePanel
              currentConversation={currentConversation}
              onConversationSelected={handleOnConversationSelected}
              conversations={conversations}
              onConversationDeleted={handleOnConversationDeleted}
              onConversationCreate={handleCreateConversation}
              refetchConversationsState={refetchConversationsState}
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem
          css={css`
            overflow: hidden;
          `}
        >
          <CommentContainer>
            <EuiFlexGroup
              css={css`
                overflow: hidden;
              `}
            >
              <EuiFlexItem
                css={css`
                  max-width: 100%;
                `}
              >
                <EuiFlyoutHeader hasBorder>
                  <AssistantHeaderFlyout
                    selectedConversation={currentConversation}
                    defaultConnector={defaultConnector}
                    docLinks={docLinks}
                    isDisabled={isDisabled}
                    isSettingsModalVisible={isSettingsModalVisible}
                    onToggleShowAnonymizedValues={onToggleShowAnonymizedValues}
                    setIsSettingsModalVisible={setIsSettingsModalVisible}
                    showAnonymizedValues={showAnonymizedValues}
                    onCloseFlyout={onCloseFlyout}
                    onChatCleared={handleOnChatCleared}
                    chatHistoryVisible={chatHistoryVisible}
                    setChatHistoryVisible={setChatHistoryVisible}
                    onConversationSelected={handleOnConversationSelected}
                    conversations={conversations}
                    refetchConversationsState={refetchConversationsState}
                    onConversationCreate={handleCreateConversation}
                  />

                  {/* Create portals for each EuiCodeBlock to add the `Investigate in Timeline` action */}
                  {createCodeBlockPortals()}
                </EuiFlyoutHeader>
                <EuiFlyoutBody
                  css={css`
                    min-height: 100px;
                    flex: 1;

                    > div {
                      display: flex;
                      flex-direction: column;
                      align-items: stretch;

                      > .euiFlyoutBody__banner {
                        overflow-x: unset;
                      }

                      > .euiFlyoutBody__overflowContent {
                        display: flex;
                        flex: 1;
                        overflow: auto;
                      }
                    }
                  `}
                  banner={
                    !isDisabled &&
                    showMissingConnectorCallout &&
                    areConnectorsFetched && (
                      <ConnectorMissingCallout
                        isConnectorConfigured={connectors?.length > 0}
                        isSettingsModalVisible={isSettingsModalVisible}
                        setIsSettingsModalVisible={setIsSettingsModalVisible}
                        isFlyoutMode={isFlyoutMode}
                      />
                    )
                  }
                >
                  {flyoutBodyContent}
                  {/* <BlockBotCallToAction
                    connectorPrompt={connectorPrompt}
                    http={http}
                    isAssistantEnabled={isAssistantEnabled}
                    isWelcomeSetup={isWelcomeSetup}
                  /> */}
                </EuiFlyoutBody>
                <EuiFlyoutFooter
                  css={css`
                    background: none;
                    border-top: 1px solid ${euiThemeVars.euiColorLightShade};
                    overflow: hidden;
                    max-height: 60%;
                    display: flex;
                    flex-direction: column;
                  `}
                >
                  <EuiPanel
                    paddingSize="m"
                    hasShadow={false}
                    css={css`
                      overflow: auto;
                    `}
                  >
                    {!isDisabled &&
                      Object.keys(promptContexts).length !== selectedPromptContextsCount && (
                        <EuiFlexGroup>
                          <EuiFlexItem>
                            <>
                              <ContextPills
                                defaultAllow={defaultAllow}
                                defaultAllowReplacement={defaultAllowReplacement}
                                promptContexts={promptContexts}
                                selectedPromptContexts={selectedPromptContexts}
                                setSelectedPromptContexts={setSelectedPromptContexts}
                                isFlyoutMode={isFlyoutMode}
                              />
                              {Object.keys(promptContexts).length > 0 && <EuiSpacer size={'s'} />}
                            </>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      )}

                    <EuiFlexGroup direction="column" gutterSize="s">
                      {Object.keys(selectedPromptContexts).length ? (
                        <EuiFlexItem grow={false}>
                          <SelectedPromptContexts
                            isNewConversation={isNewConversation}
                            promptContexts={promptContexts}
                            selectedPromptContexts={selectedPromptContexts}
                            setSelectedPromptContexts={setSelectedPromptContexts}
                            currentReplacements={currentConversation?.replacements}
                            isFlyoutMode={isFlyoutMode}
                          />
                        </EuiFlexItem>
                      ) : null}

                      <EuiFlexItem grow={false}>
                        <ChatSend
                          isDisabled={isSendingDisabled}
                          shouldRefocusPrompt={shouldRefocusPrompt}
                          userPrompt={userPrompt}
                          handleButtonSendMessage={handleButtonSendMessage}
                          handleOnChatCleared={handleOnChatCleared}
                          handlePromptChange={handlePromptChange}
                          handleSendMessage={handleSendMessage}
                          handleRegenerateResponse={handleRegenerateResponse}
                          isLoading={isLoadingChatSend}
                          isFlyoutMode={isFlyoutMode}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiPanel>

                  {!isDisabled && (
                    <EuiPanel
                      css={css`
                        background: ${euiThemeVars.euiColorLightestShade};
                      `}
                      hasShadow={false}
                      paddingSize="m"
                      borderRadius="none"
                    >
                      <QuickPrompts
                        setInput={setUserPrompt}
                        setIsSettingsModalVisible={setIsSettingsModalVisible}
                        trackPrompt={trackPrompt}
                        isFlyoutMode={isFlyoutMode}
                      />
                    </EuiPanel>
                  )}
                </EuiFlyoutFooter>
              </EuiFlexItem>
            </EuiFlexGroup>
          </CommentContainer>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return getWrapper(
    <>
      <EuiModalHeader
        css={css`
          align-items: flex-start;
          flex-direction: column;
        `}
      >
        {showTitle && (
          <AssistantHeader
            currentConversation={currentConversation}
            defaultConnector={defaultConnector}
            docLinks={docLinks}
            isDisabled={isDisabled}
            isSettingsModalVisible={isSettingsModalVisible}
            onConversationSelected={handleOnConversationSelected}
            onToggleShowAnonymizedValues={onToggleShowAnonymizedValues}
            setIsSettingsModalVisible={setIsSettingsModalVisible}
            showAnonymizedValues={showAnonymizedValues}
            title={title}
            conversations={conversations}
            onConversationDeleted={handleOnConversationDeleted}
            refetchConversationsState={refetchConversationsState}
          />
        )}

        {/* Create portals for each EuiCodeBlock to add the `Investigate in Timeline` action */}
        {createCodeBlockPortals()}

        {!isDisabled && (
          <>
            <ContextPills
              defaultAllow={defaultAllow}
              defaultAllowReplacement={defaultAllowReplacement}
              promptContexts={promptContexts}
              selectedPromptContexts={selectedPromptContexts}
              setSelectedPromptContexts={setSelectedPromptContexts}
              isFlyoutMode={isFlyoutMode}
            />
            {Object.keys(promptContexts).length > 0 && <EuiSpacer size={'s'} />}
          </>
        )}
      </EuiModalHeader>
      <EuiModalBody>
        {getWrapper(
          <>
            {comments}

            {!isDisabled && showMissingConnectorCallout && areConnectorsFetched && (
              <>
                <EuiSpacer />
                <EuiFlexGroup justifyContent="spaceAround">
                  <EuiFlexItem grow={false}>
                    <ConnectorMissingCallout
                      isConnectorConfigured={connectors?.length > 0}
                      isSettingsModalVisible={isSettingsModalVisible}
                      setIsSettingsModalVisible={setIsSettingsModalVisible}
                      isFlyoutMode={isFlyoutMode}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </>
            )}
          </>,
          !embeddedLayout
        )}
      </EuiModalBody>
      <EuiModalFooter
        css={css`
          align-items: stretch;
          flex-direction: column;
        `}
      >
        <BlockBotCallToAction
          connectorPrompt={connectorPrompt}
          http={http}
          isAssistantEnabled={isAssistantEnabled}
          isWelcomeSetup={isWelcomeSetup}
        />
        <ChatSend
          isDisabled={isSendingDisabled}
          shouldRefocusPrompt={shouldRefocusPrompt}
          userPrompt={userPrompt}
          handleButtonSendMessage={handleButtonSendMessage}
          handleOnChatCleared={handleOnChatCleared}
          handlePromptChange={handlePromptChange}
          handleSendMessage={handleSendMessage}
          handleRegenerateResponse={handleRegenerateResponse}
          isLoading={isLoadingChatSend}
          isFlyoutMode={isFlyoutMode}
        />
        {!isDisabled && (
          <QuickPrompts
            setInput={setUserPrompt}
            setIsSettingsModalVisible={setIsSettingsModalVisible}
            trackPrompt={trackPrompt}
            isFlyoutMode={isFlyoutMode}
          />
        )}
      </EuiModalFooter>
    </>,
    embeddedLayout
  );
};

AssistantComponent.displayName = 'AssistantComponent';

export const Assistant = React.memo(AssistantComponent);
