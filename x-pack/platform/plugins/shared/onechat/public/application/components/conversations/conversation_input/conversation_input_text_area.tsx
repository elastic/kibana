/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexItem,
  EuiResizeObserver,
  EuiTextArea,
  keys,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useRef } from 'react';
import { useConversationId } from '../../../hooks/use_conversation_id';

const fullHeightStyles = css`
  height: 100%;
`;
const inputContainerStyles = css`
  display: flex;
  flex-direction: column;
  .euiFormControlLayout--euiTextArea,
  .euiFormControlLayout__childrenWrapper {
    ${fullHeightStyles}
  }
  /* Using ID for high specificity selector */
  #conversationInput {
    border: none;
    box-shadow: none;
    outline: none;
    background-image: none;
  }
`;
const textareaContainerStyles = css`
  width: 100%;
  ${fullHeightStyles}
`;

const INITIAL_TEXTAREA_HEIGHT = 20;

interface ConversationInputTextAreaProps {
  message: string;
  setMessage: (message: string) => void;
  handleSubmit: () => void;
  onHeightChange: (heightDiff: number) => void;
}

export const ConversationInputTextArea: React.FC<ConversationInputTextAreaProps> = ({
  message,
  setMessage,
  handleSubmit,
  onHeightChange,
}) => {
  const conversationId = useConversationId();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const { euiTheme } = useEuiTheme();
  const textareaStyles = css`
    ${fullHeightStyles}
    padding: 0;
    ${useEuiFontSize('s')}
  `;
  const heightMeasuringProxyStyles = css`
    position: absolute;
    /*
      Position outside the viewport
      There is technically a point where the proxy will overflow the container,
      but that amount of content is so large that the API does not support it anyways.
    */
    top: -999999px;
    left: 0;
    right: 0;
    width: 100%;
    height: auto;
    min-height: auto;
    visibility: hidden;
    pointer-events: none;
    user-select: none;
    z-index: -1;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-wrap: break-word;
    font-family: ${euiTheme.font.family};
    ${useEuiFontSize('s')}
    padding: 0;
    margin: 0;
    border: 0;
  `;

  // Focus on mount
  useEffect(() => {
    // Auto focus the text area when the user switches conversations
    setTimeout(() => {
      textAreaRef.current?.focus();
    }, 200);
  }, [conversationId]);

  return (
    <EuiFlexItem css={inputContainerStyles}>
      <div css={textareaContainerStyles}>
        <EuiTextArea
          id="conversationInput"
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
          rows={1}
          inputRef={textAreaRef}
          fullWidth
          resize="none"
        />
        {/* Absolutely positioned height measuring proxy */}
        <EuiResizeObserver
          onResize={({ height }) => {
            const heightDiff = height - INITIAL_TEXTAREA_HEIGHT;
            onHeightChange(heightDiff);
          }}
        >
          {(resizeRef) => (
            <div ref={resizeRef} css={heightMeasuringProxyStyles} aria-hidden="true">
              {message}
            </div>
          )}
        </EuiResizeObserver>
      </div>
    </EuiFlexItem>
  );
};
