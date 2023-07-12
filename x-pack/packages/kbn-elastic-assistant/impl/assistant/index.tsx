/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiButtonIcon,
  EuiHorizontalRule,
  EuiCommentList,
  EuiToolTip,
  EuiSwitchEvent,
  EuiSwitch,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalBody,
} from '@elastic/eui';

import { createPortal } from 'react-dom';
import { css } from '@emotion/react';

import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/gen_ai/constants';
import { ActionConnectorProps } from '@kbn/triggers-actions-ui-plugin/public/types';
import { AssistantTitle } from './assistant_title';
import { UpgradeButtons } from '../upgrade/upgrade_buttons';
import { getMessageFromRawResponse, getWelcomeConversation } from './helpers';

import { useAssistantContext } from '../assistant_context';
import { ContextPills } from './context_pills';
import { getNewSelectedPromptContext } from '../data_anonymization/get_new_selected_prompt_context';
import { PromptTextArea } from './prompt_textarea';
import type { PromptContext, SelectedPromptContext } from './prompt_context/types';
import { useConversation } from './use_conversation';
import { CodeBlockDetails } from './use_conversation/helpers';
import { useSendMessages } from './use_send_messages';
import type { Message } from '../assistant_context/types';
import { ConversationSelector } from './conversations/conversation_selector';
import { PromptEditor } from './prompt_editor';
import { getCombinedMessage } from './prompt/helpers';
import * as i18n from './translations';
import { QuickPrompts } from './quick_prompts/quick_prompts';
import { useLoadConnectors } from '../connectorland/use_load_connectors';
import { useConnectorSetup } from '../connectorland/connector_setup';
import { WELCOME_CONVERSATION_TITLE } from './use_conversation/translations';
import { AssistantSettingsButton } from './settings/assistant_settings_button';
import { ConnectorMissingCallout } from '../connectorland/connector_missing_callout';

export interface Props {
  conversationId?: string;
  isAssistantEnabled: boolean;
  promptContextId?: string;
  shouldRefocusPrompt?: boolean;
  showTitle?: boolean;
}

/**
 * Renders a chat window with a prompt input and a chat history, along with
 * quick prompts for common actions, settings, and prompt context providers.
 */
const AssistantComponent: React.FC<Props> = ({
  conversationId = WELCOME_CONVERSATION_TITLE,
  isAssistantEnabled,
  promptContextId = '',
  shouldRefocusPrompt = false,
  showTitle = true,
}) => {
  const {
    actionTypeRegistry,
    augmentMessageCodeBlocks,
    conversations,
    defaultAllow,
    defaultAllowReplacement,
    docLinks,
    getComments,
    http,
    promptContexts,
    setLastConversationId,
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

  const { appendMessage, appendReplacements, clearConversation, createConversation } =
    useConversation();
  const { isLoading, sendMessages } = useSendMessages();

  // Connector details
  const {
    data: connectors,
    isSuccess: areConnectorsFetched,
    refetch: refetchConnectors,
  } = useLoadConnectors({ http });
  const defaultConnectorId = useMemo(() => connectors?.[0]?.id, [connectors]);
  const defaultProvider = useMemo(
    () =>
      (connectors?.[0] as ActionConnectorProps<{ apiProvider: OpenAiProviderType }, unknown>)
        ?.config?.apiProvider,
    [connectors]
  );

  // Welcome setup state
  const isWelcomeSetup = useMemo(() => (connectors?.length ?? 0) === 0, [connectors?.length]);
  const isDisabled = isWelcomeSetup || !isAssistantEnabled;

  // Welcome conversation is a special 'setup' case when no connector exists, mostly extracted to `ConnectorSetup` component,
  // but currently a bit of state is littered throughout the assistant component. TODO: clean up/isolate this state
  const welcomeConversation = useMemo(
    () => getWelcomeConversation(isAssistantEnabled),
    [isAssistantEnabled]
  );

  const [selectedConversationId, setSelectedConversationId] = useState<string>(
    isWelcomeSetup ? welcomeConversation.id : conversationId
  );
  const currentConversation = useMemo(
    () => conversations[selectedConversationId] ?? createConversation({ conversationId }),
    [conversationId, conversations, createConversation, selectedConversationId]
  );

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
    actionTypeRegistry,
    http,
    refetchConnectors,
    onSetupComplete: () => {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    },
    conversation: welcomeConversation,
    isConnectorConfigured: !!connectors?.length,
  });

  const currentTitle: { title: string | JSX.Element; titleIcon: string } =
    isWelcomeSetup && welcomeConversation.theme?.title && welcomeConversation.theme?.titleIcon
      ? { title: welcomeConversation.theme?.title, titleIcon: welcomeConversation.theme?.titleIcon }
      : { title, titleIcon: 'logoSecurity' };

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const lastCommentRef = useRef<HTMLDivElement | null>(null);

  const [promptTextPreview, setPromptTextPreview] = useState<string>('');
  const [autoPopulatedOnce, setAutoPopulatedOnce] = useState<boolean>(false);
  const [suggestedUserPrompt, setSuggestedUserPrompt] = useState<string | null>(null);

  const [showMissingConnectorCallout, setShowMissingConnectorCallout] = useState<boolean>(false);

  const [showAnonymizedValues, setShowAnonymizedValues] = useState<boolean>(false);

  const [messageCodeBlocks, setMessageCodeBlocks] = useState<CodeBlockDetails[][]>();
  const [_, setCodeBlockControlsVisible] = useState(false);
  useLayoutEffect(() => {
    setMessageCodeBlocks(augmentMessageCodeBlocks(currentConversation));
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

  // For auto-focusing prompt within timeline
  const promptTextAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (shouldRefocusPrompt && promptTextAreaRef.current) {
      promptTextAreaRef?.current.focus();
    }
  }, [shouldRefocusPrompt]);

  // Scroll to bottom on conversation change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, []);
  useEffect(() => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
      promptTextAreaRef?.current?.focus();
    }, 0);
  }, [currentConversation.messages.length, selectedPromptContextsCount]);
  ////
  //

  const selectedSystemPrompt = useMemo(() => {
    if (currentConversation.apiConfig.defaultSystemPromptId) {
      return allSystemPrompts.find(
        (prompt) => prompt.id === currentConversation.apiConfig.defaultSystemPromptId
      );
    }
  }, [allSystemPrompts, currentConversation.apiConfig.defaultSystemPromptId]);

  // Handles sending latest user prompt to API
  const handleSendMessage = useCallback(
    async (promptText) => {
      const onNewReplacements = (newReplacements: Record<string, string>) =>
        appendReplacements({
          conversationId: selectedConversationId,
          replacements: newReplacements,
        });

      const message = await getCombinedMessage({
        isNewChat: currentConversation.messages.length === 0,
        currentReplacements: currentConversation.replacements,
        onNewReplacements,
        promptText,
        selectedPromptContexts,
        selectedSystemPrompt,
      });

      const updatedMessages = appendMessage({
        conversationId: selectedConversationId,
        message,
      });

      // Reset prompt context selection and preview before sending:
      setSelectedPromptContexts({});
      setPromptTextPreview('');

      const rawResponse = await sendMessages({
        http,
        apiConfig: currentConversation.apiConfig,
        messages: updatedMessages,
      });
      const responseMessage: Message = getMessageFromRawResponse(rawResponse);
      appendMessage({ conversationId: selectedConversationId, message: responseMessage });
    },
    [
      selectedSystemPrompt,
      appendMessage,
      appendReplacements,
      currentConversation.apiConfig,
      currentConversation.messages.length,
      currentConversation.replacements,
      http,
      selectedConversationId,
      selectedPromptContexts,
      sendMessages,
    ]
  );

  const handleButtonSendMessage = useCallback(() => {
    handleSendMessage(promptTextAreaRef.current?.value?.trim() ?? '');
  }, [handleSendMessage, promptTextAreaRef]);

  const shouldDisableConversationSelectorHotkeys = useCallback(() => {
    const promptTextAreaHasFocus = document.activeElement === promptTextAreaRef.current;
    return promptTextAreaHasFocus;
  }, [promptTextAreaRef]);

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
        setSuggestedUserPrompt(promptContext.suggestedUserPrompt);
      }
    }
  }, [
    currentConversation.messages,
    promptContexts,
    promptContextId,
    handleSendMessage,
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
      messageCodeBlocks?.map((codeBlocks: CodeBlockDetails[]) => {
        return codeBlocks.map((codeBlock: CodeBlockDetails) => {
          const getElement = codeBlock.getControlContainer;
          const element = getElement?.();
          return element ? createPortal(codeBlock.button, element) : <></>;
        });
      }),
    [messageCodeBlocks]
  );

  const chatbotComments = useMemo(
    () => (
      <>
        <EuiCommentList
          comments={getComments({
            currentConversation,
            lastCommentRef,
            showAnonymizedValues,
          })}
          css={css`
            margin-right: 20px;
          `}
        />

        <EuiSpacer size={'m'} />

        {(currentConversation.messages.length === 0 ||
          Object.keys(selectedPromptContexts).length > 0) && (
          <PromptEditor
            conversation={currentConversation}
            isNewConversation={currentConversation.messages.length === 0}
            promptContexts={promptContexts}
            promptTextPreview={promptTextPreview}
            selectedPromptContexts={selectedPromptContexts}
            setSelectedPromptContexts={setSelectedPromptContexts}
          />
        )}

        <div ref={bottomRef} />
      </>
    ),
    [
      currentConversation,
      getComments,
      promptContexts,
      promptTextPreview,
      selectedPromptContexts,
      showAnonymizedValues,
    ]
  );

  const comments = useMemo(() => {
    if (isDisabled) {
      return (
        <>
          <EuiCommentList
            comments={connectorComments}
            css={css`
              margin-right: 20px;
            `}
          />
          <span ref={bottomRef} />
        </>
      );
    }

    return chatbotComments;
  }, [connectorComments, isDisabled, chatbotComments]);

  return (
    <>
      <EuiModalHeader
        css={css`
          align-items: flex-start;
          flex-direction: column;
        `}
      >
        {showTitle && (
          <>
            <EuiFlexGroup
              css={css`
                width: 100%;
              `}
              alignItems={'center'}
              justifyContent={'spaceBetween'}
            >
              <EuiFlexItem grow={false}>
                <AssistantTitle currentTitle={currentTitle} docLinks={docLinks} />
              </EuiFlexItem>

              <EuiFlexItem
                grow={false}
                css={css`
                  width: 335px;
                `}
              >
                <ConversationSelector
                  defaultConnectorId={defaultConnectorId}
                  defaultProvider={defaultProvider}
                  selectedConversationId={selectedConversationId}
                  setSelectedConversationId={setSelectedConversationId}
                  shouldDisableKeyboardShortcut={shouldDisableConversationSelectorHotkeys}
                  isDisabled={isDisabled}
                />

                <>
                  <EuiSpacer size={'s'} />
                  <EuiFlexGroup alignItems="center" gutterSize="none" justifyContent="spaceBetween">
                    <EuiFlexItem grow={false}>
                      <EuiToolTip
                        content={i18n.SHOW_ANONYMIZED_TOOLTIP}
                        position="left"
                        repositionOnScroll={true}
                      >
                        <EuiSwitch
                          checked={
                            currentConversation.replacements != null &&
                            Object.keys(currentConversation.replacements).length > 0 &&
                            showAnonymizedValues
                          }
                          compressed={true}
                          disabled={currentConversation.replacements == null}
                          label={i18n.SHOW_ANONYMIZED}
                          onChange={onToggleShowAnonymizedValues}
                        />
                      </EuiToolTip>
                    </EuiFlexItem>

                    <EuiFlexItem grow={false}>
                      <AssistantSettingsButton
                        isDisabled={isDisabled}
                        selectedConversation={currentConversation}
                        setSelectedConversationId={setSelectedConversationId}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiHorizontalRule margin={'m'} />
          </>
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
        {comments}

        {!isWelcomeSetup && showMissingConnectorCallout && (
          <>
            <EuiSpacer />
            <EuiFlexGroup justifyContent="spaceAround">
              <EuiFlexItem grow={false}>
                <ConnectorMissingCallout />
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </EuiModalBody>
      <EuiModalFooter
        css={css`
          align-items: flex-start;
          flex-direction: column;
        `}
      >
        {!isAssistantEnabled ? (
          <EuiFlexGroup
            justifyContent="spaceAround"
            css={css`
              width: 100%;
            `}
          >
            <EuiFlexItem grow={false}>
              {<UpgradeButtons basePath={http.basePath.get()} />}
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          isWelcomeSetup && (
            <EuiFlexGroup
              css={css`
                width: 100%;
              `}
            >
              <EuiFlexItem>{connectorPrompt}</EuiFlexItem>
            </EuiFlexGroup>
          )
        )}
        <EuiFlexGroup
          gutterSize="none"
          css={css`
            width: 100%;
          `}
        >
          <EuiFlexItem>
            <PromptTextArea
              onPromptSubmit={handleSendMessage}
              ref={promptTextAreaRef}
              handlePromptChange={setPromptTextPreview}
              value={isDisabled ? '' : suggestedUserPrompt ?? ''}
              isDisabled={isDisabled}
            />
          </EuiFlexItem>

          <EuiFlexItem
            grow={false}
            css={css`
              left: -34px;
              position: relative;
              top: 11px;
            `}
          >
            <EuiFlexGroup
              direction="column"
              gutterSize="xs"
              css={css`
                position: absolute;
              `}
            >
              <EuiFlexItem grow={false}>
                <EuiToolTip position="right" content={i18n.CLEAR_CHAT}>
                  <EuiButtonIcon
                    display="base"
                    iconType="cross"
                    isDisabled={isDisabled}
                    aria-label={i18n.CLEAR_CHAT}
                    color="danger"
                    onClick={() => {
                      setPromptTextPreview('');
                      clearConversation(selectedConversationId);
                      setSelectedPromptContexts({});
                      setSuggestedUserPrompt('');
                    }}
                  />
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip position="right" content={i18n.SUBMIT_MESSAGE}>
                  <EuiButtonIcon
                    display="base"
                    iconType="returnKey"
                    isDisabled={isSendingDisabled}
                    aria-label={i18n.SUBMIT_MESSAGE}
                    color="primary"
                    onClick={handleButtonSendMessage}
                    isLoading={isLoading}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        {!isDisabled && <QuickPrompts setInput={setSuggestedUserPrompt} />}
      </EuiModalFooter>
    </>
  );
};

AssistantComponent.displayName = 'AssistantComponent';

export const Assistant = React.memo(AssistantComponent);
