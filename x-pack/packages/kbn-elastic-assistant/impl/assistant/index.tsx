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
  EuiSwitchEvent,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalBody,
} from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';

import { createPortal } from 'react-dom';
import { css } from '@emotion/react';
import styled from '@emotion/styled';

import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';
import { ActionConnectorProps } from '@kbn/triggers-actions-ui-plugin/public/types';
import { useChatSend } from './chat_send/use_chat_send';
import { ChatSend } from './chat_send';
import { BlockBotCallToAction } from './block_bot/cta';
import { AssistantHeader } from './assistant_header';
import { WELCOME_CONVERSATION_TITLE } from './use_conversation/translations';
import { getDefaultConnector, getBlockBotConversation } from './helpers';

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

export interface Props {
  conversationId?: string;
  embeddedLayout?: boolean;
  promptContextId?: string;
  shouldRefocusPrompt?: boolean;
  showTitle?: boolean;
  setConversationId?: Dispatch<SetStateAction<string>>;
  onCloseFlyout?: () => void;
  isFlyoutMode?: boolean;
}

/**
 * Renders a chat window with a prompt input and a chat history, along with
 * quick prompts for common actions, settings, and prompt context providers.
 */
const AssistantComponent: React.FC<Props> = ({
  conversationId,
  embeddedLayout = false,
  promptContextId = '',
  shouldRefocusPrompt = false,
  showTitle = true,
  setConversationId,
  onCloseFlyout,
  isFlyoutMode = false,
}) => {
  const {
    assistantTelemetry,
    augmentMessageCodeBlocks,
    assistantAvailability: { isAssistantEnabled },
    conversations,
    defaultAllow,
    defaultAllowReplacement,
    docLinks,
    getComments,
    http,
    promptContexts,
    setLastConversationId,
    getConversationId,
    title,
    allSystemPrompts,
  } = useAssistantContext();

  const [selectedPromptContexts, setSelectedPromptContexts] = useState<
    Record<string, SelectedPromptContext>
  >({});
  const selectedPromptContextsCount = useMemo(
    () => Object.keys(selectedPromptContexts).length,
    [selectedPromptContexts]
  );

  const { amendMessage, createConversation } = useConversation();

  // Connector details
  const { data: connectors, isSuccess: areConnectorsFetched } = useLoadConnectors({ http });
  const defaultConnectorId = useMemo(() => getDefaultConnector(connectors)?.id, [connectors]);
  const defaultProvider = useMemo(
    () =>
      (
        getDefaultConnector(connectors) as ActionConnectorProps<
          { apiProvider: OpenAiProviderType },
          unknown
        >
      )?.config?.apiProvider,
    [connectors]
  );

  const [selectedConversationId, setSelectedConversationId] = useState<string>(
    isAssistantEnabled ? getConversationId(conversationId) : WELCOME_CONVERSATION_TITLE
  );

  useEffect(() => {
    if (setConversationId) {
      setConversationId(selectedConversationId);
    }
  }, [selectedConversationId, setConversationId]);

  const currentConversation = useMemo(
    () =>
      conversations[selectedConversationId] ??
      createConversation({ conversationId: selectedConversationId }),
    [conversations, createConversation, selectedConversationId]
  );

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
      return setLastConversationId(WELCOME_CONVERSATION_TITLE);
    }

    if (!currentConversation.excludeFromLastConversationStorage) {
      setLastConversationId(currentConversation.id);
    }
  }, [areConnectorsFetched, connectors?.length, currentConversation, setLastConversationId]);

  const { comments: connectorComments, prompt: connectorPrompt } = useConnectorSetup({
    conversation: blockBotConversation,
  });

  const currentTitle: string | JSX.Element =
    isWelcomeSetup && blockBotConversation.theme?.title ? blockBotConversation.theme?.title : title;

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
      setMessageCodeBlocks(augmentMessageCodeBlocks(currentConversation));
    }, 0);
  }, [augmentMessageCodeBlocks, currentConversation]);

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
    (cId: string) => {
      setSelectedConversationId(cId);
      setEditingSystemPromptId(
        getDefaultSystemPrompt({ allSystemPrompts, conversation: conversations[cId] })?.id
      );
    },
    [allSystemPrompts, conversations]
  );

  const handleOnSystemPromptSelectionChange = useCallback((systemPromptId?: string) => {
    setEditingSystemPromptId(systemPromptId);
  }, []);

  // Add min-height to all codeblocks so timeline icon doesn't overflow
  const codeBlockContainers = [...document.getElementsByClassName('euiCodeBlock')];
  // @ts-ignore-expect-error
  codeBlockContainers.forEach((e) => (e.style.minHeight = '75px'));
  ////

  const onToggleShowAnonymizedValues = useCallback(
    (e: EuiSwitchEvent) => {
      if (setShowAnonymizedValues != null) {
        setShowAnonymizedValues(e.target.checked);
      }
    },
    [setShowAnonymizedValues]
  );

  const isNewConversation = useMemo(
    () => currentConversation.messages.length === 0,
    [currentConversation.messages.length]
  );

  useEffect(() => {
    // Adding `conversationId !== selectedConversationId` to prevent auto-run still executing after changing selected conversation
    if (currentConversation.messages.length || conversationId !== selectedConversationId) {
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
    conversationId,
    selectedConversationId,
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
  });

  const chatbotComments = useMemo(
    () => (
      <>
        <EuiCommentList
          comments={getComments({
            currentConversation,
            showAnonymizedValues,
            amendMessage,
            regenerateMessage: handleRegenerateResponse,
            isFetchingResponse: isLoadingChatSend,
          })}
          {...(!isFlyoutMode
            ? {
                css: css`
                  margin-right: 20px;
                `,
              }
            : {})}
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
            />
          )}
      </>
    ),
    [
      amendMessage,
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
        conversationId: selectedConversationId,
        promptTitle,
      });
    },
    [assistantTelemetry, selectedConversationId]
  );

  const [chatHistoryVisible, setChatHistoryVisible] = useState(false);

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
              selectedConversationId={selectedConversationId}
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
          <CommentContainer ref={commentsContainerRef}>
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
                  {showTitle && (
                    <AssistantHeaderFlyout
                      currentConversation={currentConversation}
                      defaultConnectorId={defaultConnectorId}
                      defaultProvider={defaultProvider}
                      docLinks={docLinks}
                      isDisabled={isDisabled}
                      isSettingsModalVisible={isSettingsModalVisible}
                      onToggleShowAnonymizedValues={onToggleShowAnonymizedValues}
                      setIsSettingsModalVisible={setIsSettingsModalVisible}
                      setSelectedConversationId={setSelectedConversationId}
                      showAnonymizedValues={showAnonymizedValues}
                      title={currentTitle}
                      onCloseFlyout={onCloseFlyout}
                      onChatCleared={handleOnChatCleared}
                      chatHistoryVisible={chatHistoryVisible}
                      setChatHistoryVisible={setChatHistoryVisible}
                    />
                  )}

                  {/* Create portals for each EuiCodeBlock to add the `Investigate in Timeline` action */}
                  {createCodeBlockPortals()}
                </EuiFlyoutHeader>
                <EuiFlyoutBody
                  css={css`
                    min-height: 100px;
                    flex: 1;
                  `}
                >
                  <EuiPanel hasShadow={false}>
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
            defaultConnectorId={defaultConnectorId}
            defaultProvider={defaultProvider}
            docLinks={docLinks}
            isDisabled={isDisabled}
            isSettingsModalVisible={isSettingsModalVisible}
            onConversationSelected={handleOnConversationSelected}
            onToggleShowAnonymizedValues={onToggleShowAnonymizedValues}
            selectedConversationId={selectedConversationId}
            setIsSettingsModalVisible={setIsSettingsModalVisible}
            setSelectedConversationId={setSelectedConversationId}
            showAnonymizedValues={showAnonymizedValues}
            title={currentTitle}
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
