/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiTextArea, keys } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useRef } from 'react';
import { useConversationId } from '../../../hooks/use_conversation_id';

const inputContainerStyles = css`
  display: flex;
  flex-direction: column;
  .euiFormControlLayout--euiTextArea,
  .euiFormControlLayout__childrenWrapper {
    height: 100%;
  }
  /* Using ID for high specificity selector */
  #conversationInput {
    border: none;
    box-shadow: none;
    outline: none;
    background-image: none;
  }
`;
const textareaStyles = css`
  height: 100%;
  padding: 0;
`;

interface ConversationInputTextAreaProps {
  input: string;
  setInput: (input: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  agentId?: string;
}

export const ConversationInputTextArea: React.FC<ConversationInputTextAreaProps> = ({
  input,
  setInput,
  onSubmit,
  disabled,
  agentId,
}) => {
  const conversationId = useConversationId();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Auto focus the text area when the user switches conversations
    setTimeout(() => {
      textAreaRef.current?.focus();
    }, 200);
  }, [conversationId]);

  const disabledPlaceholder = i18n.translate(
    'xpack.onechat.conversationInputForm.disabledPlaceholder',
    {
      defaultMessage: 'Agent "{agentId}" has been deleted. Please start a new conversation.',
      values: {
        agentId,
      },
    }
  );

  return (
    <EuiFlexItem css={inputContainerStyles}>
      <EuiTextArea
        id="conversationInput"
        name={i18n.translate('xpack.onechat.conversationInputForm.textArea.name', {
          defaultMessage: 'Conversation input',
        })}
        css={textareaStyles}
        data-test-subj="onechatAppConversationInputFormTextArea"
        value={input}
        onChange={(event) => {
          setInput(event.currentTarget.value);
        }}
        onKeyDown={(event) => {
          if (!event.shiftKey && event.key === keys.ENTER) {
            event.preventDefault();
            onSubmit();
          }
        }}
        placeholder={
          disabled
            ? disabledPlaceholder
            : i18n.translate('xpack.onechat.conversationInputForm.placeholder', {
                defaultMessage: 'Ask anything',
              })
        }
        rows={1}
        inputRef={textAreaRef}
        fullWidth
        resize="none"
        disabled={disabled}
      />
    </EuiFlexItem>
  );
};
