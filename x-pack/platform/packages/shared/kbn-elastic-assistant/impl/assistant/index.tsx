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
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import styled from '@emotion/styled';

import useEvent from 'react-use/lib/useEvent';
import { AssistantBody } from './assistant_body';
import { useCurrentConversation } from './use_current_conversation';
import { useDataStreamApis } from './use_data_stream_apis';
import { useChatSend } from './chat_send/use_chat_send';
import { ChatSend } from './chat_send';
import { getDefaultConnector } from './helpers';

import { useAssistantContext } from '../assistant_context';
import { ContextPills } from './context_pills';
import { getNewSelectedPromptContext } from '../data_anonymization/get_new_selected_prompt_context';
import type { PromptContext, SelectedPromptContext } from './prompt_context/types';
import { QuickPrompts } from './quick_prompts/quick_prompts';
import { useLoadConnectors } from '../connectorland/use_load_connectors';
import { ConversationSidePanel } from './conversations/conversation_sidepanel';
import { SelectedPromptContexts } from './prompt_editor/selected_prompt_contexts';
import { AssistantHeader } from './assistant_header';
import { AnonymizedValuesAndCitationsTour } from '../tour/anonymized_values_and_citations_tour';
import {
  conversationContainsAnonymizedValues,
  conversationContainsContentReferences,
} from './conversations/utils';
import {
  LastConversation,
  useAssistantLastConversation,
  useAssistantSpaceId,
} from './use_space_aware_context';
import { AssistantConversationBanner } from './assistant_conversation_banner';

export const CONVERSATION_SIDE_PANEL_WIDTH = 220;

const CommentContainer = styled('span')`
  display: flex;
  flex: 1;
  overflow: hidden;
`;

export interface Props {
  chatHistoryVisible?: boolean;
  lastConversation?: LastConversation;
  onCloseFlyout?: () => void;
  promptContextId?: string;
  setChatHistoryVisible?: Dispatch<SetStateAction<boolean>>;
  shouldRefocusPrompt?: boolean;
}

/**
 * Renders a chat window with a prompt input and a chat history, along with
 * quick prompts for common actions, settings, and prompt context providers.
 */
const AssistantComponent: React.FC<Props> = ({
  chatHistoryVisible,
  lastConversation,
  onCloseFlyout,
  promptContextId = '',
  setChatHistoryVisible,
  shouldRefocusPrompt = false,
}) => {
  const { euiTheme } = useEuiTheme();
  const {
    assistantAvailability: { isAssistantEnabled },
    assistantTelemetry,
    currentAppId,
    augmentMessageCodeBlocks,
    getComments,
    http,
    promptContexts,
    currentUserAvatar,
    contentReferencesVisible,
    showAnonymizedValues,
    setContentReferencesVisible,
    setShowAnonymizedValues,
  } = useAssistantContext();

  const [selectedPromptContexts, setSelectedPromptContexts] = useState<
    Record<string, SelectedPromptContext>
  >({});

  const selectedPromptContextsCount = useMemo(
    () => Object.keys(selectedPromptContexts).length,
    [selectedPromptContexts]
  );

  const {
    allPrompts,
    allSystemPrompts,
    anonymizationFields,
    conversations,
    isErrorAnonymizationFields,
    isFetchedAnonymizationFields,
    isFetchedCurrentUserConversations,
    isFetchedPrompts,
    isFetchingCurrentUserConversations,
    isLoadingAnonymizationFields,
    isLoadingCurrentUserConversations,
    setPaginationObserver,
    refetchPrompts,
    refetchCurrentUserConversations,
    setIsStreaming,
  } = useDataStreamApis({ http, isAssistantEnabled });

  // Connector details
  const { data: connectors, isFetchedAfterMount: isFetchedConnectors } = useLoadConnectors({
    http,
  });
  const defaultConnector = useMemo(() => getDefaultConnector(connectors), [connectors]);
  const spaceId = useAssistantSpaceId();
  const { getLastConversation, setLastConversation } = useAssistantLastConversation({ spaceId });
  const lastConversationFromLocalStorage = useMemo(
    () => getLastConversation(),
    [getLastConversation]
  );

  const {
    currentConversation,
    currentSystemPrompt,
    handleCreateConversation,
    handleOnConversationDeleted,
    handleOnConversationSelected,
    refetchCurrentConversation,
    setCurrentConversation,
    setCurrentSystemPromptId,
  } = useCurrentConversation({
    allSystemPrompts,
    currentAppId,
    connectors,
    conversations,
    defaultConnector,
    spaceId,
    refetchCurrentUserConversations,
    lastConversation: lastConversation ?? lastConversationFromLocalStorage,
    mayUpdateConversations:
      isFetchedConnectors && isFetchedCurrentUserConversations && isFetchedPrompts,
    setLastConversation,
  });

  const isInitialLoad = useMemo(() => {
    if (!isAssistantEnabled) {
      return false;
    }
    return (
      (!isFetchedAnonymizationFields && !isFetchedCurrentUserConversations && !isFetchedPrompts) ||
      !currentConversation
    );
  }, [
    currentConversation,
    isAssistantEnabled,
    isFetchedAnonymizationFields,
    isFetchedCurrentUserConversations,
    isFetchedPrompts,
  ]);

  // Welcome setup state
  const isWelcomeSetup = useMemo(
    () =>
      Object.keys(conversations).some(
        (conversation) =>
          // if any conversation has a non-empty connector id, we're not in welcome set up
          conversations[conversation]?.apiConfig?.connectorId != null &&
          conversations[conversation]?.apiConfig?.connectorId !== ''
      )
        ? false
        : (connectors?.length ?? 0) === 0,
    [connectors?.length, conversations]
  );
  const isDisabled = useMemo(
    () => isWelcomeSetup || !isAssistantEnabled || isInitialLoad,
    [isWelcomeSetup, isAssistantEnabled, isInitialLoad]
  );

  // Settings modal state (so it isn't shared between assistant instances like Timeline)
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);

  const [autoPopulatedOnce, setAutoPopulatedOnce] = useState<boolean>(false);

  const [_, setCodeBlockControlsVisible] = useState(false);
  useLayoutEffect(() => {
    let unmountFunc = () => {};
    if (currentConversation) {
      // need in order for code block controls to be added to the DOM
      setTimeout(() => {
        unmountFunc = augmentMessageCodeBlocks.mount({ currentConversation, showAnonymizedValues });
      }, 0);
    }

    return () => {
      unmountFunc();
    };
  }, [augmentMessageCodeBlocks, currentConversation, showAnonymizedValues]);

  // Keyboard shortcuts to toggle the visibility of content references and anonymized values
  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.altKey && event.code === 'KeyC') {
        if (!conversationContainsContentReferences(currentConversation)) return;
        event.preventDefault();
        setContentReferencesVisible(!contentReferencesVisible);
      }
      if (event.altKey && event.code === 'KeyA') {
        if (!conversationContainsAnonymizedValues(currentConversation)) return;
        event.preventDefault();
        setShowAnonymizedValues(!showAnonymizedValues);
      }
    },
    [
      setContentReferencesVisible,
      contentReferencesVisible,
      setShowAnonymizedValues,
      showAnonymizedValues,
      currentConversation,
    ]
  );

  useEvent('keydown', onKeyDown);

  // Show missing connector callout if no connectors are configured

  const showMissingConnectorCallout = useMemo(() => {
    if (
      !isLoadingCurrentUserConversations &&
      isFetchedConnectors &&
      currentConversation &&
      currentConversation.id !== ''
    ) {
      if (!currentConversation?.apiConfig?.connectorId) {
        return true;
      }

      return !connectors?.some(
        (connector) => connector.id === currentConversation.apiConfig?.connectorId
      );
    }

    return false;
  }, [isFetchedConnectors, connectors, currentConversation, isLoadingCurrentUserConversations]);

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

  // Add min-height to all codeblocks so timeline icon doesn't overflow
  const codeBlockContainers = [...document.getElementsByClassName('euiCodeBlock')];
  // @ts-ignore-expect-error
  codeBlockContainers.forEach((e) => (e.style.minHeight = '85px'));
  ////

  const {
    abortStream,
    handleOnChatCleared,
    handleChatSend,
    handleRegenerateResponse,
    isLoading: isLoadingChatSend,
    setUserPrompt,
    userPrompt,
  } = useChatSend({
    currentConversation,
    http,
    refetchCurrentUserConversations,
    selectedPromptContexts,
    setSelectedPromptContexts,
    setCurrentConversation,
  });

  useEffect(() => {
    if (
      autoPopulatedOnce &&
      currentConversation &&
      lastConversation?.title !== currentConversation?.title
    ) {
      // reset PromptContexts state when conversation changes
      setAutoPopulatedOnce(false);
      setSelectedPromptContexts({});
      setUserPrompt(null);
    }
  }, [autoPopulatedOnce, currentConversation, lastConversation?.title, setUserPrompt]);

  useEffect(() => {
    if (
      (currentConversation && lastConversation?.title !== currentConversation?.title) ||
      currentConversation?.messages.length ||
      autoPopulatedOnce
    ) {
      return;
    }

    const promptContext: PromptContext | undefined = promptContexts[promptContextId];
    if (
      promptContext != null &&
      !isLoadingAnonymizationFields &&
      !isErrorAnonymizationFields &&
      isFetchedAnonymizationFields &&
      anonymizationFields
    ) {
      setAutoPopulatedOnce(true);

      if (!Object.keys(selectedPromptContexts).includes(promptContext.id)) {
        const addNewSelectedPromptContext = async () => {
          const newSelectedPromptContext = await getNewSelectedPromptContext({
            anonymizationFields,
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
    anonymizationFields,
    autoPopulatedOnce,
    currentConversation,
    isErrorAnonymizationFields,
    isFetchedAnonymizationFields,
    isLoadingAnonymizationFields,
    lastConversation?.title,
    promptContextId,
    promptContexts,
    selectedPromptContexts,
    setUserPrompt,
  ]);

  const comments = useMemo(
    () => (
      <>
        <EuiCommentList
          comments={getComments({
            abortStream,
            currentConversation,
            showAnonymizedValues,
            refetchCurrentConversation,
            regenerateMessage: handleRegenerateResponse,
            isFetchingResponse: isLoadingChatSend,
            setIsStreaming,
            currentUserAvatar,
            systemPromptContent: currentSystemPrompt?.content,
            contentReferencesVisible,
          })}
          // Avoid comments going off the flyout
          css={css`
            padding-bottom: ${euiTheme.size.l};

            > li > div:nth-child(2) {
              overflow: hidden;
            }
          `}
        />

        {currentConversation?.messages.length !== 0 && selectedPromptContextsCount > 0 && (
          <EuiSpacer size={'m'} />
        )}
      </>
    ),
    [
      getComments,
      abortStream,
      currentConversation,
      showAnonymizedValues,
      refetchCurrentConversation,
      handleRegenerateResponse,
      isLoadingChatSend,
      setIsStreaming,
      currentUserAvatar,
      currentSystemPrompt?.content,
      contentReferencesVisible,
      euiTheme.size.l,
      selectedPromptContextsCount,
    ]
  );

  const trackPrompt = useCallback(
    (promptTitle: string) => {
      if (currentConversation?.title) {
        assistantTelemetry?.reportAssistantQuickPrompt({
          promptTitle,
        });
      }
    },
    [assistantTelemetry, currentConversation?.title]
  );

  return (
    <>
      <AnonymizedValuesAndCitationsTour conversation={currentConversation} />
      <EuiFlexGroup direction={'row'} wrap={false} gutterSize="none">
        {chatHistoryVisible && (
          <EuiFlexItem
            grow={false}
            css={css`
              inline-size: ${CONVERSATION_SIDE_PANEL_WIDTH}px;
              border-right: ${euiTheme.border.thin};
            `}
          >
            <ConversationSidePanel
              currentConversation={currentConversation}
              onConversationSelected={handleOnConversationSelected}
              conversations={conversations}
              onConversationDeleted={handleOnConversationDeleted}
              onConversationCreate={handleCreateConversation}
              isFetchingCurrentUserConversations={isFetchingCurrentUserConversations}
              refetchCurrentUserConversations={refetchCurrentUserConversations}
              setPaginationObserver={setPaginationObserver}
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem
          css={css`
            overflow: hidden;
          `}
        >
          <CommentContainer data-test-subj="assistantChat">
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
                  <AssistantHeader
                    chatHistoryVisible={chatHistoryVisible}
                    conversations={conversations}
                    conversationsLoaded={isFetchedCurrentUserConversations}
                    defaultConnector={defaultConnector}
                    isAssistantEnabled={isAssistantEnabled}
                    isDisabled={isDisabled || isLoadingChatSend}
                    isLoading={isInitialLoad}
                    isSettingsModalVisible={isSettingsModalVisible}
                    onChatCleared={handleOnChatCleared}
                    onCloseFlyout={onCloseFlyout}
                    onConversationCreate={handleCreateConversation}
                    onConversationSelected={handleOnConversationSelected}
                    refetchCurrentConversation={refetchCurrentConversation}
                    refetchCurrentUserConversations={refetchCurrentUserConversations}
                    refetchPrompts={refetchPrompts}
                    selectedConversation={currentConversation}
                    setChatHistoryVisible={setChatHistoryVisible}
                    setIsSettingsModalVisible={setIsSettingsModalVisible}
                    setPaginationObserver={setPaginationObserver}
                  />
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
                    isFetchedConnectors && (
                      <AssistantConversationBanner
                        isSettingsModalVisible={isSettingsModalVisible}
                        setIsSettingsModalVisible={setIsSettingsModalVisible}
                        shouldShowMissingConnectorCallout={showMissingConnectorCallout}
                        currentConversation={currentConversation}
                        connectors={connectors}
                      />
                    )
                  }
                >
                  <AssistantBody
                    allSystemPrompts={allSystemPrompts}
                    comments={comments}
                    currentConversation={currentConversation}
                    currentSystemPromptId={currentSystemPrompt?.id}
                    handleOnConversationSelected={handleOnConversationSelected}
                    http={http}
                    isAssistantEnabled={isAssistantEnabled}
                    isLoading={isInitialLoad}
                    isSettingsModalVisible={isSettingsModalVisible}
                    isWelcomeSetup={isWelcomeSetup}
                    setUserPrompt={setUserPrompt}
                    setCurrentSystemPromptId={setCurrentSystemPromptId}
                    setIsSettingsModalVisible={setIsSettingsModalVisible}
                  />
                </EuiFlyoutBody>
                <EuiFlyoutFooter
                  css={css`
                    background: none;
                    border-top: ${euiTheme.border.thin};
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
                                anonymizationFields={anonymizationFields}
                                promptContexts={promptContexts}
                                selectedPromptContexts={selectedPromptContexts}
                                setSelectedPromptContexts={setSelectedPromptContexts}
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
                            promptContexts={promptContexts}
                            selectedPromptContexts={selectedPromptContexts}
                            setSelectedPromptContexts={setSelectedPromptContexts}
                            currentReplacements={currentConversation?.replacements}
                          />
                        </EuiFlexItem>
                      ) : null}

                      <EuiFlexItem grow={false}>
                        <ChatSend
                          handleChatSend={handleChatSend}
                          setUserPrompt={setUserPrompt}
                          handleRegenerateResponse={handleRegenerateResponse}
                          isDisabled={isSendingDisabled}
                          isLoading={isLoadingChatSend}
                          shouldRefocusPrompt={shouldRefocusPrompt}
                          userPrompt={userPrompt}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiPanel>

                  {!isDisabled && (
                    <EuiPanel
                      css={css`
                        background: ${euiTheme.colors.backgroundBaseSubdued};
                      `}
                      hasShadow={false}
                      paddingSize="m"
                      borderRadius="none"
                    >
                      <QuickPrompts
                        setInput={setUserPrompt}
                        setIsSettingsModalVisible={setIsSettingsModalVisible}
                        trackPrompt={trackPrompt}
                        allPrompts={allPrompts}
                      />
                    </EuiPanel>
                  )}
                </EuiFlyoutFooter>
              </EuiFlexItem>
            </EuiFlexGroup>
          </CommentContainer>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

AssistantComponent.displayName = 'AssistantComponent';

export const Assistant = React.memo(AssistantComponent);
