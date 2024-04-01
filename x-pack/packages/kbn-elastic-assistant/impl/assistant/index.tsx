/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable complexity */

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
  // EuiSwitchEvent,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalBody,
} from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { useMeasure } from 'react-use';

import { createPortal } from 'react-dom';
import { css } from '@emotion/react';
import styled from '@emotion/styled';

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

import { useAssistantContext } from '../assistant_context';
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
import { SystemPrompt } from './prompt_editor/system_prompt';
import { SelectedPromptContexts } from './prompt_editor/selected_prompt_contexts';
import { AssistantHeaderFlyout } from './assistant_header/assistant_header_flyout';

const CommentContainer = styled('span')`
  display: flex;
  flex: 1;
  overflow: hidden;
`;
import {
  FetchConversationsResponse,
  useFetchCurrentUserConversations,
} from './api/conversations/use_fetch_current_user_conversations';
import { Conversation } from '../assistant_context/types';
import { clearPresentationData } from '../connectorland/connector_setup/helpers';

export interface Props {
  conversationTitle?: string;
  embeddedLayout?: boolean;
  promptContextId?: string;
  shouldRefocusPrompt?: boolean;
  showTitle?: boolean;
  onCloseFlyout?: () => void;
  isFlyoutMode?: boolean;
  setConversationTitle?: Dispatch<SetStateAction<string>>;
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
  onCloseFlyout,
  isFlyoutMode = false,
  setConversationTitle,
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
    promptContexts,
    setLastConversationTitle,
    getLastConversationTitle,
    title,
    allSystemPrompts,
    baseConversations,
  } = useAssistantContext();

  const {
    getDefaultConversation,
    getConversation,
    deleteConversation,
    // amendMessage,
    // createConversation,
  } = useConversation();

  const [selectedPromptContexts, setSelectedPromptContexts] = useState<
    Record<string, SelectedPromptContext>
  >({});
  const [conversations, setConversations] = useState<Record<string, Conversation>>({});
  const selectedPromptContextsCount = useMemo(
    () => Object.keys(selectedPromptContexts).length,
    [selectedPromptContexts]
  );

  const onFetchedConversations = useCallback(
    (conversationsData: FetchConversationsResponse): Record<string, Conversation> =>
      mergeBaseWithPersistedConversations(baseConversations, conversationsData),
    [baseConversations]
  );
  const {
    data: conversationsData,
    isLoading,
    isError,
    refetch,
  } = useFetchCurrentUserConversations({ http, onFetch: onFetchedConversations });

  useEffect(() => {
    if (!isLoading && !isError) {
      setConversations(conversationsData ?? {});
    }
  }, [conversationsData, isError, isLoading]);

  const refetchResults = useCallback(async () => {
    const updatedConv = await refetch();
    if (!updatedConv.isLoading) {
      setConversations(updatedConv.data ?? {});
      return updatedConv.data;
    }
  }, [refetch]);

  let [flyoutCommentsRef, { height }] = useMeasure<HTMLDivElement>();

  console.error('flyoutCommentsRef', flyoutCommentsRef, height);

  // Connector details
  const { data: connectors, isSuccess: areConnectorsFetched } = useLoadConnectors({
    http,
  });
  const defaultConnector = useMemo(() => getDefaultConnector(connectors), [connectors]);

  const [selectedConversationTitle, setSelectedConversationTitle] = useState<string>(
    isAssistantEnabled ? getLastConversationTitle(conversationTitle) : WELCOME_CONVERSATION_TITLE
  );

  useEffect(() => {
    if (setConversationTitle) {
      setConversationTitle(selectedConversationTitle);
    }
  }, [selectedConversationTitle, setConversationTitle]);

  const [currentConversation, setCurrentConversation] = useState<Conversation>(
    getDefaultConversation({ cTitle: selectedConversationTitle })
  );

  const refetchCurrentConversation = useCallback(
    async (cId?: string) => {
      if (cId === '' || !conversations[selectedConversationTitle]) {
        return;
      }
      const updatedConversation = await getConversation(
        cId ?? conversations[selectedConversationTitle].id
      );
      if (updatedConversation) {
        setCurrentConversation(updatedConversation);
      }
      return updatedConversation;
    },
    [conversations, getConversation, selectedConversationTitle]
  );

  useEffect(() => {
    if (!isLoading && Object.keys(conversations).length > 0) {
      const conversation =
        conversations[selectedConversationTitle ?? getLastConversationTitle(conversationTitle)];
      if (conversation) {
        setCurrentConversation(conversation);
      }
    }
  }, [
    conversationTitle,
    conversations,
    getLastConversationTitle,
    isLoading,
    selectedConversationTitle,
  ]);

  // Welcome setup state
  const isWelcomeSetup = useMemo(() => {
    // if any conversation has a connector id, we're not in welcome set up
    return Object.keys(conversations).some(
      (conversation) => conversations[conversation].apiConfig?.connectorId != null
    )
      ? false
      : (connectors?.length ?? 0) === 0;
  }, [connectors?.length, conversations]);
  const isDisabled = isWelcomeSetup || !isAssistantEnabled;

  // Welcome conversation is a special 'setup' case when no connector exists, mostly extracted to `ConnectorSetup` component,
  // but currently a bit of state is littered throughout the assistant component. TODO: clean up/isolate this state
  const blockBotConversation = useMemo(
    () => getBlockBotConversation(currentConversation, isAssistantEnabled),
    [currentConversation, isAssistantEnabled]
  );

  // Settings modal state (so it isn't shared between assistant instances like Timeline)
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);

  // Remember last selection for reuse after keyboard shortcut is pressed.
  // Clear it if there is no connectors
  useEffect(() => {
    if (areConnectorsFetched && !connectors?.length) {
      return setLastConversationTitle(WELCOME_CONVERSATION_TITLE);
    }

    if (!currentConversation.excludeFromLastConversationStorage) {
      setLastConversationTitle(currentConversation.title);
    }
  }, [
    areConnectorsFetched,
    connectors?.length,
    conversationsData,
    currentConversation,
    isLoading,
    setLastConversationTitle,
  ]);

  const [promptTextPreview, setPromptTextPreview] = useState<string>('');
  const [autoPopulatedOnce, setAutoPopulatedOnce] = useState<boolean>(false);
  const [userPrompt, setUserPrompt] = useState<string | null>(null);

  const [showMissingConnectorCallout, setShowMissingConnectorCallout] = useState<boolean>(false);

  const [showAnonymizedValues, setShowAnonymizedValues] = useState<boolean>(false);

  const [messageCodeBlocks, setMessageCodeBlocks] = useState<CodeBlockDetails[][]>();
  const [_, setCodeBlockControlsVisible] = useState(false);
  useLayoutEffect(() => {
    // need in order for code block controls to be added to the DOM
    setTimeout(() => {
      setMessageCodeBlocks(augmentMessageCodeBlocks(currentConversation, showAnonymizedValues));
    }, 0);
  }, [augmentMessageCodeBlocks, currentConversation, showAnonymizedValues]);

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
    const parent = isFlyoutMode
      ? commentsContainerRef.current?.parentElement?.parentElement
      : commentsContainerRef.current?.parentElement;

    if (!parent) {
      return;
    }
    // when scrollHeight changes, parent is scrolled to bottom
    parent.scrollTop = parent.scrollHeight;
  }, [
    isFlyoutMode,
    commentsContainerRef.current?.parentElement?.scrollHeight,
    commentsContainerRef.current?.parentElement?.parentElement?.scrollHeight,
  ]);

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
      if (cId === '') {
        const updatedConv = await refetchResults();
        if (updatedConv) {
          setCurrentConversation(updatedConv[cTitle]);
          setSelectedConversationTitle(cTitle);
          setEditingSystemPromptId(
            getDefaultSystemPrompt({ allSystemPrompts, conversation: updatedConv[cTitle] })?.id
          );
        }
      } else {
        setSelectedConversationTitle(cTitle);
        const refetchedConversation = await refetchCurrentConversation(cId);
        setEditingSystemPromptId(
          getDefaultSystemPrompt({ allSystemPrompts, conversation: refetchedConversation })?.id
        );
      }
    },
    [allSystemPrompts, refetchCurrentConversation, refetchResults]
  );

  const { comments: connectorComments, prompt: connectorPrompt } = useConnectorSetup({
    isFlyoutMode,
    conversation: blockBotConversation,
    onConversationUpdate: handleOnConversationSelected,
    onSetupComplete: () => {
      setConversations({
        ...conversations,
        [currentConversation.title]: clearPresentationData(currentConversation),
      });
    },
  });

  const handleOnConversationDeleted = useCallback(
    async (cTitle: string) => {
      setTimeout(() => {
        deleteConversation(conversations[cTitle].id);
      }, 0);
      const deletedConv = { ...conversations };
      delete deletedConv[cTitle];
      setConversations(deletedConv);
    },
    [conversations, deleteConversation]
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
    () => currentConversation.messages.length === 0,
    [currentConversation.messages.length]
  );

  useEffect(() => {
    // Adding `conversationTitle !== selectedConversationTitle` to prevent auto-run still executing after changing selected conversation
    if (currentConversation.messages.length || conversationTitle !== selectedConversationTitle) {
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
    currentConversation.messages,
    promptContexts,
    promptContextId,
    conversationTitle,
    selectedConversationTitle,
    selectedPromptContexts,
    autoPopulatedOnce,
    defaultAllow,
    defaultAllowReplacement,
  ]);

  // Show missing connector callout if no connectors are configured
  useEffect(() => {
    const connectorExists =
      connectors?.some(
        (connector) => connector.id === currentConversation.apiConfig?.connectorId
      ) ?? false;
    setShowMissingConnectorCallout(!connectorExists);
  }, [connectors, currentConversation]);

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
    // setSelectedConversation: handleOnConversationSelected,
    setCurrentConversation,
    refresh: refetchCurrentConversation,
  });

  const chatbotComments = useMemo(
    () => (
      <>
        <EuiCommentList
          comments={getComments({
            currentConversation,
            showAnonymizedValues,
            refetchCurrentConversation,
            regenerateMessage: handleRegenerateResponse,
            isFetchingResponse: isLoadingChatSend,
          })}
          {...(!isFlyoutMode
            ? {
                css: css`
                  margin-right: 20px;
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

        {currentConversation.messages.length !== 0 && selectedPromptContextsCount > 0 && (
          <EuiSpacer size={'m'} />
        )}

        {!isFlyoutMode &&
          (currentConversation.messages.length === 0 || selectedPromptContextsCount > 0) && (
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
          )}
      </>
    ),
    [
      refetchCurrentConversation,
      currentConversation,
      editingSystemPromptId,
      getComments,
      handleOnSystemPromptSelectionChange,
      handleRegenerateResponse,
      isFlyoutMode,
      isLoadingChatSend,
      isNewConversation,
      isSettingsModalVisible,
      promptContexts,
      promptTextPreview,
      selectedPromptContexts,
      selectedPromptContextsCount,
      showAnonymizedValues,
    ]
  );

  const comments = useMemo(() => {
    if (isDisabled) {
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
  }, [connectorComments, isDisabled, chatbotComments]);

  const trackPrompt = useCallback(
    (promptTitle: string) => {
      assistantTelemetry?.reportAssistantQuickPrompt({
        conversationId: currentConversation.title,
        promptTitle,
      });
    },
    [assistantTelemetry, currentConversation.title]
  );

  const [chatHistoryVisible, setChatHistoryVisible] = useState(false);

  const refetchConversationsState = useCallback(async () => {
    const refetchedConversations = await refetchResults();
    if (refetchedConversations && refetchedConversations[currentConversation.title]) {
      setCurrentConversation(refetchedConversations[currentConversation.title]);
    }
  }, [currentConversation.title, refetchResults]);

  if (isFlyoutMode) {
    return (
      <EuiFlexGroup direction={'row'} wrap={false} gutterSize="none">
        {chatHistoryVisible && (
          <EuiFlexItem
            grow={false}
            css={css`
              inline-size: 220px;
              border-right: 1px solid ${euiThemeVars.euiColorLightShade};
            `}
          >
            <ConversationSidePanel
              currentConversation={currentConversation}
              onConversationSelected={handleOnConversationSelected}
              conversations={conversations}
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem
          css={css`
            inline-size: 50vw;
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
                    setCurrentConversation={setCurrentConversation}
                    onToggleShowAnonymizedValues={onToggleShowAnonymizedValues}
                    setIsSettingsModalVisible={setIsSettingsModalVisible}
                    showAnonymizedValues={showAnonymizedValues}
                    title={selectedConversationTitle}
                    onCloseFlyout={onCloseFlyout}
                    onChatCleared={handleOnChatCleared}
                    chatHistoryVisible={chatHistoryVisible}
                    setChatHistoryVisible={setChatHistoryVisible}
                    onConversationSelected={handleOnConversationSelected}
                    conversations={conversations}
                    refetchConversationsState={refetchConversationsState}
                  />

                  {/* Create portals for each EuiCodeBlock to add the `Investigate in Timeline` action */}
                  {createCodeBlockPortals()}
                </EuiFlyoutHeader>
                <EuiFlyoutBody
                  css={css`
                    min-height: 100px;
                    flex: 1;
                  `}
                >
                  <EuiPanel
                    hasShadow={false}
                    panelRef={(element) => {
                      console.error('element', element);
                      flyoutCommentsRef = element;
                    }}
                  >
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
                            />
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </>
                    )}
                  </EuiPanel>
                </EuiFlyoutBody>
                <EuiFlyoutFooter
                  css={css`
                    background: none;
                    border-top: 1px solid ${euiThemeVars.euiColorLightShade};
                    overflow: auto;
                    max-height: 60%;
                  `}
                >
                  <EuiPanel paddingSize="m" hasShadow={false}>
                    <BlockBotCallToAction
                      connectorPrompt={connectorPrompt}
                      http={http}
                      isAssistantEnabled={isAssistantEnabled}
                      isWelcomeSetup={isWelcomeSetup}
                    />
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

                    <EuiPanel
                      hasShadow={false}
                      hasBorder
                      css={
                        currentConversation.messages.length === 0 || selectedPromptContextsCount > 0
                          ? css`
                              background: ${euiThemeVars.euiColorLightestShade};
                            `
                          : css`
                              padding: 0;
                              border: 0;
                            `
                      }
                    >
                      <EuiFlexGroup direction="column" gutterSize="s">
                        {currentConversation.messages.length === 0 && (
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
                        )}

                        {Object.keys(selectedPromptContexts).length ? (
                          <EuiFlexItem grow={false}>
                            <SelectedPromptContexts
                              isNewConversation={isNewConversation}
                              promptContexts={promptContexts}
                              selectedPromptContexts={selectedPromptContexts}
                              setSelectedPromptContexts={setSelectedPromptContexts}
                              currentReplacements={currentConversation.replacements}
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
            setCurrentConversation={setCurrentConversation}
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
