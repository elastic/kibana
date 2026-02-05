/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  useEuiShadow,
  useEuiShadowHover,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { PropsWithChildren } from 'react';
import React, { useEffect, useMemo } from 'react';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import { useSendMessage } from '../../../context/send_message/send_message_context';
import { useAgentBuilderAgents } from '../../../hooks/agents/use_agents';
import { useValidateAgentId } from '../../../hooks/agents/use_validate_agent_id';
import { useIsSendingMessage } from '../../../hooks/use_is_sending_message';
import {
  useAgentId,
  useHasActiveConversation,
  useIsAwaitingPrompt,
} from '../../../hooks/use_conversation';
import { MessageEditor, useMessageEditor } from './message_editor';
import { InputActions } from './input_actions';
import { borderRadiusXlStyles } from '../../../../common.styles';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { AttachmentPillsRow } from './attachment_pills_row';

const INPUT_MIN_HEIGHT = '150px';
const useInputBorderStyles = () => {
  const { euiTheme } = useEuiTheme();
  return css`
    border: ${euiTheme.border.thin};
    ${borderRadiusXlStyles}
    border-color: ${euiTheme.colors.borderBaseSubdued};
    &:focus-within[aria-disabled='false'] {
      border-color: ${euiTheme.colors.primary};
    }
  `;
};
const useInputShadowStyles = () => {
  return css`
    ${useEuiShadow('s')}
    &:hover {
      ${useEuiShadowHover('s')}
    }
    &:focus-within[aria-disabled='false'] {
      ${useEuiShadow('xl')}
      :hover {
        ${useEuiShadowHover('xl')}
      }
    }
  `;
};

const containerAriaLabel = i18n.translate('xpack.agentBuilder.conversationInput.container.label', {
  defaultMessage: 'Message input form',
});

const InputContainer: React.FC<
  PropsWithChildren<{ isDisabled: boolean; isCollapsed: boolean }>
> = ({ children, isDisabled, isCollapsed }) => {
  const { euiTheme } = useEuiTheme();
  const inputContainerStyles = css`
    width: 100%;
    min-height: ${isCollapsed ? '0' : INPUT_MIN_HEIGHT};
    padding: ${euiTheme.size.base};
    flex-grow: 0;
    transition: box-shadow 250ms, border-color 250ms, min-height 250ms ease-out;
    background-color: ${euiTheme.colors.backgroundBasePlain};

    ${useInputBorderStyles()}
    ${useInputShadowStyles()}

    &[aria-disabled='true'] {
      background-color: ${euiTheme.colors.backgroundBaseDisabled};
    }
  `;

  return (
    <EuiFlexGroup
      css={inputContainerStyles}
      direction="column"
      gutterSize="s"
      responsive={false}
      alignItems="stretch"
      justifyContent="center"
      data-test-subj="agentBuilderConversationInputForm"
      aria-label={containerAriaLabel}
      aria-disabled={isDisabled}
    >
      {children}
    </EuiFlexGroup>
  );
};

interface ConversationInputProps {
  onSubmit?: () => void;
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

export const ConversationInput: React.FC<ConversationInputProps> = ({ onSubmit }) => {
  const isSendingMessage = useIsSendingMessage();
  const { sendMessage, pendingMessage, error, isResuming } = useSendMessage();
  const { isFetched } = useAgentBuilderAgents();
  const agentId = useAgentId();
  const conversationId = useConversationId();
  const messageEditor = useMessageEditor();
  const hasActiveConversation = useHasActiveConversation();
  const isAwaitingPrompt = useIsAwaitingPrompt();
  const { attachments, initialMessage, autoSendInitialMessage, resetInitialMessage } =
    useConversationContext();

  const validateAgentId = useValidateAgentId();
  const isAgentIdValid = validateAgentId(agentId);

  const isAgentDeleted = !isAgentIdValid && isFetched && Boolean(agentId);
  const isInputDisabled = isAgentDeleted || isAwaitingPrompt || isResuming;
  const isSubmitDisabled =
    messageEditor.isEmpty || isSendingMessage || !isAgentIdValid || isAwaitingPrompt;

  const placeholder = isAgentDeleted ? disabledPlaceholder(agentId) : enabledPlaceholder;

  const editorContainerStyles = css`
    display: flex;
    flex-direction: column;
    height: 100%;
  `;
  // Hide attachments if there's an error from current round or if message has been just sent
  const shouldHideAttachments = Boolean(error) || isSendingMessage;

  const shouldCollapseInput = isSendingMessage || hasActiveConversation;

  const visibleAttachments = useMemo(() => {
    if (!attachments || shouldHideAttachments) return [];
    return attachments
      .filter((attachment) => !attachment.hidden)
      .map((attachment, idx) => ({
        ...attachment,
        id: attachment.id ?? `attachment-${idx}`,
      }));
  }, [attachments, shouldHideAttachments]);

  const isNewConversation = !conversationId;
  // Set initial message in input when {autoSendInitialMessage} is false and {initialMessage} is provided
  useEffect(() => {
    if (initialMessage && !autoSendInitialMessage && isNewConversation) {
      messageEditor.setContent(initialMessage);
      messageEditor.focus();
      resetInitialMessage?.(); // Reset the initial message to avoid sending it again
    }
  }, [
    initialMessage,
    autoSendInitialMessage,
    isNewConversation,
    messageEditor,
    resetInitialMessage,
  ]);

  // Auto-focus when conversation changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      messageEditor.focus();
    }, 200);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [conversationId, messageEditor]);

  const handleSubmit = () => {
    if (isSubmitDisabled) {
      return;
    }
    const content = messageEditor.getContent();
    sendMessage({ message: content });
    messageEditor.clear();
    onSubmit?.();
  };

  return (
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
          data-test-subj="agentBuilderConversationInputEditor"
        />
      </EuiFlexItem>
      {!isAgentDeleted && (
        <InputActions
          onSubmit={handleSubmit}
          isSubmitDisabled={isSubmitDisabled}
          resetToPendingMessage={() => {
            if (pendingMessage) {
              messageEditor.setContent(pendingMessage);
            }
          }}
          agentId={agentId}
        />
      )}
    </InputContainer>
  );
};
