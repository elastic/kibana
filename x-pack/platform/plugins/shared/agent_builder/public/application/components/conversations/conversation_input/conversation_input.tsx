/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { PropsWithChildren } from 'react';
import React, { useEffect, useMemo } from 'react';
import { ConversationInputShell } from '@kbn/agent-builder-browser';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import { useConversationStream } from '../../../hooks/use_conversation_stream';
import { useSubmitMessage } from '../../../hooks/use_submit_message';
import { useAgentBuilderAgents } from '../../../hooks/agents/use_agents';
import { useValidateAgentId } from '../../../hooks/agents/use_validate_agent_id';
import {
  useAgentId,
  useConversationTitle,
  useHasActiveConversation,
  useIsAwaitingPrompt,
} from '../../../hooks/use_conversation';
import { useExperimentalFeatures } from '../../../hooks/use_experimental_features';
import { useConversationMessageQueue } from '../../../context/conversation_message_queue/conversation_message_queue_context';
import { MessageEditor, useMessageEditor, CommandBadgeSerializationError } from './message_editor';
import { MessageQueue } from './message_queue';
import { useToasts } from '../../../hooks/use_toasts';
import { InputActions } from './input_actions';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { AttachmentPillsRow } from './attachment_pills_row';

const EMPTY_QUEUE: readonly string[] = [];

const containerAriaLabel = i18n.translate('xpack.agentBuilder.conversationInput.container.label', {
  defaultMessage: 'Message input form',
});

const messages = {
  invalidCommandBadge: i18n.translate('xpack.agentBuilder.conversationInput.invalidCommandBadge', {
    defaultMessage: 'Your message contains an invalid command. Remove the command and try again.',
  }),
  messageQueueFull: i18n.translate('xpack.agentBuilder.conversationInput.messageQueue.full', {
    defaultMessage: 'Message queue is full. Wait for the agent to finish before queuing more.',
  }),
};

const flexGrowZeroStyles = css`
  flex-grow: 0;
`;

const InputContainer: React.FC<
  PropsWithChildren<{ isDisabled: boolean; isCollapsed: boolean }>
> = ({ children, isDisabled, isCollapsed }) => (
  <ConversationInputShell
    isDisabled={isDisabled}
    isCollapsed={isCollapsed}
    css={flexGrowZeroStyles}
    data-test-subj="agentBuilderConversationInputForm"
    aria-label={containerAriaLabel}
  >
    {children}
  </ConversationInputShell>
);

interface ConversationInputProps {
  onSubmit?: () => void;
  onEditorFocus?: () => void;
  onSubmitOverride?: (message: string) => void;
}

const disabledPlaceholder = (agentId?: string) =>
  i18n.translate('xpack.agentBuilder.conversationInput.textArea.disabledPlaceholder', {
    defaultMessage: 'Agent "{agentId}" has been deleted. Please start a new conversation.',
    values: {
      agentId,
    },
  });
const enabledPlaceholder = i18n.translate(
  'xpack.agentBuilder.conversationInput.textArea.enabledPlaceholder',
  {
    defaultMessage: 'Ask anything',
  }
);

const getMessageEditorAriaLabel = ({
  isNewConversation,
  conversationTitle,
}: {
  isNewConversation: boolean;
  conversationTitle: string;
}): string | undefined => {
  if (isNewConversation) {
    return i18n.translate(
      'xpack.agentBuilder.conversationInput.messageEditor.newConversationLabel',
      { defaultMessage: 'New conversation, Message input' }
    );
  }
  return i18n.translate('xpack.agentBuilder.conversationInput.messageEditor.conversationLabel', {
    defaultMessage: '{title} conversation, Message input',
    values: { title: conversationTitle },
  });
};

export const ConversationInput: React.FC<ConversationInputProps> = ({
  onSubmit,
  onEditorFocus,
  onSubmitOverride,
}) => {
  const { pendingMessage, error, isResuming, isResponseLoading } = useConversationStream();
  const { isFetched } = useAgentBuilderAgents();
  const agentId = useAgentId();
  const conversationId = useConversationId();

  const { messageEditor, controller: messageEditorController } = useMessageEditor({
    onEditorFocus,
  });
  const { addErrorToast } = useToasts();
  const hasActiveConversation = useHasActiveConversation();
  const isAwaitingPrompt = useIsAwaitingPrompt();
  const { attachments, initialMessage, autoSendInitialMessage, resetInitialMessage } =
    useConversationContext();
  const submitMessage = useSubmitMessage();

  const isExperimentalFeaturesEnabled = useExperimentalFeatures();
  const { queues, enqueue, remove, clear, isMessageQueueFull } = useConversationMessageQueue();

  const messageQueue: readonly string[] = conversationId
    ? queues.get(conversationId) ?? EMPTY_QUEUE
    : EMPTY_QUEUE;
  const isQueueFull = Boolean(conversationId) && isMessageQueueFull(conversationId!);
  const canQueueMessage = isExperimentalFeaturesEnabled && Boolean(conversationId);

  const canDrainQueue =
    canQueueMessage && !isResponseLoading && !isAwaitingPrompt && messageQueue.length > 0;

  const validateAgentId = useValidateAgentId();
  const isAgentIdValid = validateAgentId(agentId);

  const isAgentDeleted = !isAgentIdValid && isFetched && Boolean(agentId);
  const isInputDisabled = isAgentDeleted || isAwaitingPrompt || isResuming;

  const isSubmitDisabled =
    messageEditorController.isEmpty ||
    !isAgentIdValid ||
    isAwaitingPrompt ||
    (isExperimentalFeaturesEnabled ? isQueueFull : isResponseLoading);

  const placeholder = isAgentDeleted ? disabledPlaceholder(agentId) : enabledPlaceholder;

  const editorContainerStyles = css`
    display: flex;
    flex-direction: column;
    height: 100%;
  `;
  // Hide attachments if there's an error from current round or if message has been just sent
  const shouldHideAttachments = Boolean(error) || isResponseLoading;

  const shouldCollapseInput = isResponseLoading || hasActiveConversation;

  const visibleAttachments = useMemo(() => {
    if (!attachments || shouldHideAttachments) return [];
    return attachments.filter((attachment) => {
      if ('items' in attachment) return true; // AttachmentGroup — always visible
      return !attachment.hidden;
    });
  }, [attachments, shouldHideAttachments]);

  const isNewConversation = !conversationId;
  const { title: conversationTitle } = useConversationTitle();

  const messageEditorAriaLabel = getMessageEditorAriaLabel({
    isNewConversation,
    conversationTitle,
  });

  // Set initial message in input when {autoSendInitialMessage} is false and {initialMessage} is provided
  useEffect(() => {
    if (initialMessage && !autoSendInitialMessage && isNewConversation && !isAwaitingPrompt) {
      messageEditorController.setContent(initialMessage);
      messageEditorController.focus();
      resetInitialMessage?.(); // Reset the initial message to avoid sending it again
    }
  }, [
    initialMessage,
    autoSendInitialMessage,
    isNewConversation,
    isAwaitingPrompt,
    messageEditorController,
    resetInitialMessage,
  ]);

  // Skip auto-focus while a HITL prompt is open, it should own focus instead
  useEffect(() => {
    if (isAwaitingPrompt) return;
    const timeoutId = setTimeout(() => {
      messageEditorController.focus();
    }, 200);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [conversationId, messageEditorController, isAwaitingPrompt]);

  useEffect(() => {
    if (!canDrainQueue) return;

    // Delay flushing the queue by 1 second so the user always sees the pending bubbles before they merge into a single outgoing message
    const timeoutId = setTimeout(() => {
      // Flush every queued message as one send, separated by a blank line
      const flushed = messageQueue.join('\n\n');
      clear(conversationId!);
      submitMessage(flushed);
      onSubmit?.();
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [canDrainQueue, conversationId, clear, submitMessage, onSubmit, messageQueue]);

  const handleSubmit = () => {
    if (isSubmitDisabled) {
      return;
    }
    let content: string;
    try {
      content = messageEditorController.getContent();
    } catch (contentError) {
      if (contentError instanceof CommandBadgeSerializationError) {
        addErrorToast(messages.invalidCommandBadge);
      }
      return;
    }
    if (canQueueMessage && isQueueFull) {
      addErrorToast(messages.messageQueueFull);
      return;
    }
    if (onSubmitOverride) {
      onSubmitOverride(content);
    } else if (canQueueMessage && isResponseLoading) {
      enqueue(conversationId!, content);
      messageEditorController.clear();
      return;
    } else {
      submitMessage(content);
    }
    messageEditorController.clear();
    onSubmit?.();
  };

  // Positioning ancestor for <MessageQueue> — the queue floats above the input rather than
  // sitting in the layout flow, so growing the queue never reshapes the conversation
  // scroll area above it.
  const inputWithQueueStyles = css`
    position: relative;
  `;

  return (
    <div css={inputWithQueueStyles}>
      {canQueueMessage && (
        <MessageQueue queue={messageQueue} onRemove={(i) => remove(conversationId!, i)} />
      )}
      <InputContainer isDisabled={isInputDisabled} isCollapsed={shouldCollapseInput}>
        {visibleAttachments.length > 0 && (
          <EuiFlexItem grow={false}>
            <AttachmentPillsRow attachments={visibleAttachments} removable />
          </EuiFlexItem>
        )}
        <EuiFlexItem css={editorContainerStyles}>
          <MessageEditor
            messageEditor={messageEditor}
            onSubmit={handleSubmit}
            disabled={isInputDisabled}
            placeholder={placeholder}
            ariaLabel={messageEditorAriaLabel}
            data-test-subj="agentBuilderConversationInputEditor"
          />
        </EuiFlexItem>
        {!isAgentDeleted && (
          <InputActions
            onSubmit={handleSubmit}
            isSubmitDisabled={isSubmitDisabled}
            resetToPendingMessage={() => {
              if (pendingMessage) {
                messageEditorController.setContent(pendingMessage);
              }
            }}
            agentId={agentId}
          />
        )}
      </InputContainer>
    </div>
  );
};
