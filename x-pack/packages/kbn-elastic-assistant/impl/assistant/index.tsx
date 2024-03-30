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
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiCommentList,
  EuiSwitchEvent,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalBody,
} from '@elastic/eui';

import { createPortal } from 'react-dom';
import { css } from '@emotion/react';

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
  setConversationTitle,
}) => {
  const {
    assistantTelemetry,
    augmentMessageCodeBlocks,
    assistantAvailability: { isAssistantEnabled },
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

  const { getDefaultConversation, getConversation, deleteConversation } = useConversation();

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
      // Set the last conversation as current conversation or use persisted or non-persisted Welcom conversation
      setCurrentConversation(
        conversation ??
          conversations[WELCOME_CONVERSATION_TITLE] ??
          getDefaultConversation({ cTitle: WELCOME_CONVERSATION_TITLE })
      );
    }
  }, [
    conversationTitle,
    conversations,
    getDefaultConversation,
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
        if (refetchedConversation) {
          setConversations({
            ...conversations,
            [refetchedConversation.title]: refetchedConversation,
          });
        }
      }
    },
    [allSystemPrompts, conversations, refetchCurrentConversation, refetchResults]
  );

  const { comments: connectorComments, prompt: connectorPrompt } = useConnectorSetup({
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

  const onToggleShowAnonymizedValues = useCallback(
    (e: EuiSwitchEvent) => {
      if (setShowAnonymizedValues != null) {
        setShowAnonymizedValues(e.target.checked);
      }
    },
    [setShowAnonymizedValues]
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
    setCurrentConversation,
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
          css={css`
            margin-right: 20px;
          `}
        />

        {currentConversation.messages.length !== 0 && selectedPromptContextsCount > 0 && (
          <EuiSpacer size={'m'} />
        )}

        {(currentConversation.messages.length === 0 || selectedPromptContextsCount > 0) && (
          <PromptEditor
            conversation={currentConversation}
            editingSystemPromptId={editingSystemPromptId}
            isNewConversation={currentConversation.messages.length === 0}
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
      refetchCurrentConversation,
      currentConversation,
      editingSystemPromptId,
      getComments,
      handleOnSystemPromptSelectionChange,
      handleRegenerateResponse,
      isLoadingChatSend,
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

  const refetchConversationsState = useCallback(async () => {
    const refetchedConversations = await refetchResults();
    if (refetchedConversations && refetchedConversations[currentConversation.title]) {
      setCurrentConversation(refetchedConversations[currentConversation.title]);
    }
  }, [currentConversation.title, refetchResults]);

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
          align-items: flex-start;
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
        />
        {!isDisabled && (
          <QuickPrompts
            setInput={setUserPrompt}
            setIsSettingsModalVisible={setIsSettingsModalVisible}
            trackPrompt={trackPrompt}
          />
        )}
      </EuiModalFooter>
    </>,
    embeddedLayout
  );
};

AssistantComponent.displayName = 'AssistantComponent';

export const Assistant = React.memo(AssistantComponent);
