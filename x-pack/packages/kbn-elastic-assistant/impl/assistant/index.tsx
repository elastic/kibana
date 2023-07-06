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
  EuiCallOut,
  EuiIcon,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalBody,
  EuiModalHeaderTitle,
} from '@elastic/eui';

import { createPortal } from 'react-dom';
import { css } from '@emotion/react';

import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/gen_ai/constants';
import { ActionConnectorProps } from '@kbn/triggers-actions-ui-plugin/public/types';
import { getMessageFromRawResponse } from './helpers';

import { ConversationSettingsPopover } from './conversation_settings_popover/conversation_settings_popover';
import { useAssistantContext } from '../assistant_context';
import { ContextPills } from './context_pills';
import { getNewSelectedPromptContext } from '../data_anonymization/get_new_selected_prompt_context';
import { SettingsPopover } from '../data_anonymization/settings/settings_popover';
import { PromptTextArea } from './prompt_textarea';
import type { PromptContext, SelectedPromptContext } from './prompt_context/types';
import { useConversation } from './use_conversation';
import { CodeBlockDetails } from './use_conversation/helpers';
import { useSendMessages } from './use_send_messages';
import type { Message } from '../assistant_context/types';
import { ConversationSelector } from './conversation_selector';
import { PromptEditor } from './prompt_editor';
import { getCombinedMessage } from './prompt/helpers';
import * as i18n from './translations';
import { QuickPrompts } from './quick_prompts/quick_prompts';
import { useLoadConnectors } from '../connectorland/use_load_connectors';
import { useConnectorSetup } from '../connectorland/connector_setup';
import { WELCOME_CONVERSATION_TITLE } from './use_conversation/translations';
import { BASE_CONVERSATIONS } from './use_conversation/sample_conversations';

export interface Props {
  promptContextId?: string;
  conversationId?: string;
  showTitle?: boolean;
  shouldRefocusPrompt?: boolean;
}

/**
 * Renders a chat window with a prompt input and a chat history, along with
 * quick prompts for common actions, settings, and prompt context providers.
 */
const AssistantComponent: React.FC<Props> = ({
  promptContextId = '',
  showTitle = true,
  conversationId = WELCOME_CONVERSATION_TITLE,
  shouldRefocusPrompt = false,
}) => {
  const {
    actionTypeRegistry,
    augmentMessageCodeBlocks,
    conversations,
    defaultAllow,
    defaultAllowReplacement,
    getComments,
    http,
    promptContexts,
    setLastConversationId,
    title,
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

  const [selectedConversationId, setSelectedConversationId] = useState<string>(conversationId);
  const currentConversation = useMemo(
    () => conversations[selectedConversationId] ?? createConversation({ conversationId }),
    [conversationId, conversations, createConversation, selectedConversationId]
  );

  // Welcome conversation is a special 'setup' case when no connector exists, mostly extracted to `ConnectorSetup` component,
  // but currently a bit of state is littered throughout the assistant component. TODO: clean up/isolate this state
  const welcomeConversation = useMemo(
    () => conversations[selectedConversationId] ?? BASE_CONVERSATIONS[WELCOME_CONVERSATION_TITLE],
    [conversations, selectedConversationId]
  );

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

  // Remember last selection for reuse after keyboard shortcut is pressed.
  // Clear it if there is no connectors
  useEffect(() => {
    if (areConnectorsFetched && !connectors?.length) {
      return setLastConversationId('');
    }
    setLastConversationId(selectedConversationId);
  }, [areConnectorsFetched, connectors?.length, selectedConversationId, setLastConversationId]);

  const isWelcomeSetup = (connectors?.length ?? 0) === 0;

  const { connectorDialog, connectorPrompt } = useConnectorSetup({
    actionTypeRegistry,
    http,
    refetchConnectors,
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

  const [messageCodeBlocks, setMessageCodeBlocks] = useState<CodeBlockDetails[][]>(
    augmentMessageCodeBlocks(currentConversation)
  );
  const [_, setCodeBlockControlsVisible] = useState(false);
  useLayoutEffect(() => {
    setMessageCodeBlocks(augmentMessageCodeBlocks(currentConversation));
  }, [augmentMessageCodeBlocks, currentConversation]);

  const isSendingDisabled = useMemo(() => {
    return isWelcomeSetup || showMissingConnectorCallout;
  }, [showMissingConnectorCallout, isWelcomeSetup]);

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
    bottomRef.current?.scrollIntoView?.({ behavior: 'auto' });
  }, []);
  useEffect(() => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView?.({ behavior: 'auto' });
      promptTextAreaRef?.current?.focus();
    }, 0);
  }, [currentConversation.messages.length, selectedPromptContextsCount]);
  ////

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
        selectedSystemPrompt: currentConversation.apiConfig.defaultSystemPrompt,
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

  const comments = useMemo(
    () =>
      getComments({
        currentConversation,
        lastCommentRef,
        showAnonymizedValues,
      }),
    [currentConversation, getComments, showAnonymizedValues]
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

  const CodeBlockPortals = useMemo(
    () =>
      messageCodeBlocks.map((codeBlocks: CodeBlockDetails[]) => {
        return codeBlocks.map((codeBlock: CodeBlockDetails) => {
          const element: Element = codeBlock.controlContainer as Element;

          return codeBlock.controlContainer != null ? (
            createPortal(codeBlock.button, element)
          ) : (
            <></>
          );
        });
      }),
    [messageCodeBlocks]
  );
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
                <EuiModalHeaderTitle>
                  <EuiFlexGroup alignItems={'center'}>
                    <EuiFlexItem grow={false}>
                      <EuiIcon type={currentTitle.titleIcon} size="xl" />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>{currentTitle.title}</EuiFlexItem>
                  </EuiFlexGroup>
                </EuiModalHeaderTitle>
              </EuiFlexItem>

              <EuiFlexItem
                grow={false}
                css={css`
                  width: 335px;
                `}
              >
                <ConversationSelector
                  conversationId={selectedConversationId}
                  defaultConnectorId={defaultConnectorId}
                  defaultProvider={defaultProvider}
                  onSelectionChange={(id) => setSelectedConversationId(id)}
                  shouldDisableKeyboardShortcut={shouldDisableConversationSelectorHotkeys}
                  isDisabled={isWelcomeSetup}
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
                      <SettingsPopover />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiHorizontalRule margin={'m'} />
            {!isWelcomeSetup && showMissingConnectorCallout && (
              <>
                <EuiCallOut
                  color="danger"
                  iconType="controlsVertical"
                  size="m"
                  title={i18n.MISSING_CONNECTOR_CALLOUT_TITLE}
                >
                  <p>{i18n.MISSING_CONNECTOR_CALLOUT_DESCRIPTION}</p>
                </EuiCallOut>
                <EuiSpacer size={'s'} />
              </>
            )}
          </>
        )}

        {/* Create portals for each EuiCodeBlock to add the `Investigate in Timeline` action */}
        {CodeBlockPortals}

        {!isWelcomeSetup && (
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
        {isWelcomeSetup ? (
          connectorDialog
        ) : (
          <>
            <EuiCommentList
              comments={comments}
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
        )}

        <EuiSpacer />
      </EuiModalBody>
      <EuiModalFooter
        css={css`
          align-items: flex-start;
          flex-direction: column;
        `}
      >
        <EuiFlexGroup
          gutterSize="none"
          css={css`
            width: 100%;
          `}
        >
          {isWelcomeSetup && <EuiFlexItem>{connectorPrompt}</EuiFlexItem>}
        </EuiFlexGroup>
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
              value={isWelcomeSetup ? '' : suggestedUserPrompt ?? ''}
              isDisabled={isWelcomeSetup}
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
                    isDisabled={isWelcomeSetup}
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
              <EuiFlexItem grow={true}>
                <ConversationSettingsPopover
                  actionTypeRegistry={actionTypeRegistry}
                  conversation={currentConversation}
                  isDisabled={isWelcomeSetup}
                  http={http}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        {!isWelcomeSetup && <QuickPrompts setInput={setSuggestedUserPrompt} />}
      </EuiModalFooter>
    </>
  );
};

AssistantComponent.displayName = 'AssistantComponent';

export const Assistant = React.memo(AssistantComponent);
