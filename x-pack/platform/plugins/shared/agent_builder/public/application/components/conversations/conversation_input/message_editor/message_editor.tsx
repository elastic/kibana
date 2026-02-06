/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme, keys, useGeneratedHtmlId, useEuiFontSize } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { MessageEditorInstance } from './use_message_editor';

const EDITOR_MAX_HEIGHT = 240;

const heightStyles = css`
  flex-grow: 1;
  height: 100%;
  max-height: ${EDITOR_MAX_HEIGHT}px;
  overflow-y: auto;
`;
const resetStyles = (id: string) => css`
  &#${CSS.escape(id)} {
    outline-style: none;
  }
`;
const disabledStyles = css`
  &[contenteditable='false'] {
    cursor: not-allowed;
  }
`;

const editorAriaLabel = i18n.translate('xpack.agentBuilder.conversationInput.messageEditor.label', {
  defaultMessage: 'Message input',
});

interface MessageEditorProps {
  messageEditor: MessageEditorInstance;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  'data-test-subj'?: string;
}

export const MessageEditor: React.FC<MessageEditorProps> = ({
  messageEditor,
  onSubmit,
  disabled = false,
  placeholder = '',
  'data-test-subj': dataTestSubj,
}) => {
  const [isComposing, setIsComposing] = useState(false);
  const { ref, onChange } = messageEditor._internal;
  const editorId = useGeneratedHtmlId({ prefix: 'messageEditor' });
  const { euiTheme } = useEuiTheme();
  const placeholderStyles = css`
    &[data-placeholder]:empty:before {
      content: attr(data-placeholder);
      color: ${euiTheme.colors.textDisabled};
      pointer-events: none;
      display: block;
    }
  `;
  const fontStyles = css`
    ${useEuiFontSize('m')}
  `;
  const editorStyles = [
    heightStyles,
    resetStyles(editorId),
    disabledStyles,
    placeholderStyles,
    fontStyles,
  ];

  const handleCompositionStart = () => setIsComposing(true);
  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  return (
    <div
      ref={ref}
      id={editorId}
      contentEditable={disabled ? 'false' : 'plaintext-only'}
      role="textbox"
      aria-multiline="true"
      aria-label={editorAriaLabel}
      aria-disabled={disabled}
      tabIndex={0}
      data-placeholder={placeholder}
      data-test-subj={dataTestSubj}
      css={editorStyles}
      onInput={onChange}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onKeyDown={(event) => {
        if (!event.shiftKey && event.key === keys.ENTER && !isComposing) {
          event.preventDefault();
          onSubmit();
        }
      }}
    />
  );
};
