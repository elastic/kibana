/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  useEuiShadow,
  useEuiShadowHover,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { PropsWithChildren } from 'react';
import React, { useEffect, useMemo } from 'react';
import { useSendMessage } from '../../../context/send_message/send_message_context';
import { useIsSendingMessage } from '../../../hooks/use_is_sending_message';
import { MessageEditor, useMessageEditor } from './message_editor';
import { useAgentId } from '../../../hooks/use_conversation';
import { useOnechatAgents } from '../../../hooks/agents/use_agents';
import { useValidateAgentId } from '../../../hooks/agents/use_validate_agent_id';
import { ConversationInputActions } from './conversation_input_actions';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { AttachmentPillsRow } from './attachment_pills_row';

const INPUT_MIN_HEIGHT = '150px';
// Non-standard EUI border radius
const INPUT_BORDER_RADIUS = '6px';
const useInputBorderStyles = () => {
  const { euiTheme } = useEuiTheme();
  return css`
    border: ${euiTheme.border.thin};
    border-radius: ${INPUT_BORDER_RADIUS};
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

const containerAriaLabel = i18n.translate('xpack.onechat.conversationInput.container.label', {
  defaultMessage: 'Message input form',
});

const InputContainer: React.FC<PropsWithChildren<{ isDisabled: boolean }>> = ({
  children,
  isDisabled,
}) => {
  const { euiTheme } = useEuiTheme();
  const inputContainerStyles = css`
    width: 100%;
    min-height: ${INPUT_MIN_HEIGHT};
    padding: ${euiTheme.size.base};
    flex-grow: 0;
    transition: box-shadow 250ms, border-color 250ms;
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
  i18n.translate('xpack.onechat.conversationInput.textArea.disabledPlaceholder', {
    defaultMessage: 'Agent "{agentId}" has been deleted. Please start a new conversation.',
    values: {
      agentId,
    },
  });
const enabledPlaceholder = i18n.translate(
  'xpack.onechat.conversationInput.textArea.enabledPlaceholder',
  {
    defaultMessage: 'Ask anything',
  }
);

const inputContainerStyles = css`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

export const ConversationInput: React.FC<ConversationInputProps> = ({ onSubmit }) => {
  const isSendingMessage = useIsSendingMessage();
  const { sendMessage, pendingMessage, error } = useSendMessage();
  const { isFetched } = useOnechatAgents();
  const agentId = useAgentId();
  const conversationId = useConversationId();
  const messageEditor = useMessageEditor();
  const { attachments } = useConversationContext();

  const validateAgentId = useValidateAgentId();
  const isAgentIdValid = validateAgentId(agentId);

  const isInputDisabled = !isAgentIdValid && isFetched && !!agentId;
  const isSubmitDisabled = messageEditor.isEmpty || isSendingMessage || !isAgentIdValid;

  const placeholder = isInputDisabled ? disabledPlaceholder(agentId) : enabledPlaceholder;

  // Hide attachments if there's an error from current round or if message has been just sent
  const shouldHideAttachments = Boolean(error) || isSendingMessage;

  const visibleAttachments = useMemo(() => {
    if (!attachments || shouldHideAttachments) return [];
    return attachments
      .filter((attachment) => !attachment.hidden)
      .map((attachment, idx) => ({
        ...attachment,
        id: attachment.id ?? `attachment-${idx}`,
      }));
  }, [attachments, shouldHideAttachments]);

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
    <InputContainer isDisabled={isInputDisabled}>
      {visibleAttachments.length > 0 && (
        <EuiFlexItem grow={false}>
          <AttachmentPillsRow attachments={visibleAttachments} />
        </EuiFlexItem>
      )}
      <EuiFlexItem css={inputContainerStyles}>
        <MessageEditor
          messageEditor={messageEditor}
          onSubmit={handleSubmit}
          disabled={isInputDisabled}
          placeholder={placeholder}
          data-test-subj="agentBuilderConversationInputEditor"
        />
      </EuiFlexItem>
      {!isInputDisabled && (
        <ConversationInputActions
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
