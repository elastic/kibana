/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, keys, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useRef } from 'react';

const inputContainerStyles = css`
  display: flex;
  flex-direction: column;
`;

interface ConversationInputTextAreaProps {
  message: string;
  setMessage: (message: string) => void;
  handleSubmit: () => void;
}

export const ConversationInputTextArea: React.FC<ConversationInputTextAreaProps> = ({
  message,
  setMessage,
  handleSubmit,
}) => {
  const { euiTheme } = useEuiTheme();
  const textareaStyles = css`
    flex-grow: 1;
    border: none;
    box-shadow: none;
    padding: 0;
    resize: none;
    &:focus:focus-visible {
      outline: none;
    }
    background-color: ${euiTheme.components.forms.background};
    color: ${euiTheme.colors.textParagraph};
  `;
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    setTimeout(() => {
      textAreaRef.current?.focus();
    }, 200);
  }, []);
  return (
    <EuiFlexItem css={inputContainerStyles}>
      <textarea
        name={i18n.translate('xpack.onechat.conversationInputForm.textArea.name', {
          defaultMessage: 'Conversation input',
        })}
        css={textareaStyles}
        data-test-subj="onechatAppConversationInputFormTextArea"
        value={message}
        onChange={(event) => {
          setMessage(event.currentTarget.value);
        }}
        onKeyDown={(event) => {
          if (!event.shiftKey && event.key === keys.ENTER) {
            event.preventDefault();
            handleSubmit();
          }
        }}
        placeholder={i18n.translate('xpack.onechat.conversationInputForm.placeholder', {
          defaultMessage: 'Ask anything',
        })}
        ref={textAreaRef}
      />
    </EuiFlexItem>
  );
};
