/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { useEuiTheme, keys, useGeneratedHtmlId } from '@elastic/eui';
import type { MessageEditorInstance } from './use_message_editor';

const EDITOR_MAX_HEIGHT = 240;

const useEditorStyles = (editorId: string) => {
  const { euiTheme } = useEuiTheme();
  const escapedId = CSS.escape(editorId);
  const editorStyles = css`
    height: 100%;
    max-height: ${EDITOR_MAX_HEIGHT}px;
    overflow-y: auto;
    padding: 0;

    &#${escapedId} {
      border-style: none;
      box-shadow: none;
      outline-style: none;
      background-image: none;
    }

    &[data-placeholder]:empty:before {
      content: attr(data-placeholder);
      color: ${euiTheme.colors.subduedText};
      pointer-events: none;
      display: block;
    }

    &[contenteditable='false'] {
      cursor: not-allowed;
    }
  `;
  return editorStyles;
};
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
  const { ref, onChange } = messageEditor._internal;
  const editorId = useGeneratedHtmlId({ prefix: 'messageEditor' });
  const editorStyles = useEditorStyles(editorId);

  return (
    <div
      ref={ref}
      id={editorId}
      contentEditable={disabled ? 'false' : 'plaintext-only'}
      role="textbox"
      aria-multiline="true"
      aria-label="Message input"
      aria-disabled={disabled}
      tabIndex={0}
      data-placeholder={placeholder}
      data-test-subj={dataTestSubj}
      css={editorStyles}
      onInput={() => {
        onChange?.();
      }}
      onKeyDown={(event) => {
        if (!event.shiftKey && event.key === keys.ENTER) {
          event.preventDefault();
          onSubmit();
        }
      }}
    />
  );
};
