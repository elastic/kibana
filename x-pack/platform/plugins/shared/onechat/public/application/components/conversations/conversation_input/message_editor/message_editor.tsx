/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useImperativeHandle } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme, keys, useGeneratedHtmlId } from '@elastic/eui';
import type { MessageEditorInstance } from './use_message_editor';

const useEditorStyles = (editorId: string) => {
  const { euiTheme } = useEuiTheme();
  const escapedId = CSS.escape(editorId);
  const editorStyles = css`
    height: 100%;
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
  messageEditor?: MessageEditorInstance;
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
  const { ref, onChange } = messageEditor?._internal ?? {};
  const editorRef = useRef<HTMLDivElement>(null);
  const editorId = useGeneratedHtmlId({ prefix: 'messageEditor' });
  const editorStyles = useEditorStyles(editorId);

  // Expose imperative handle for parent components
  useImperativeHandle(ref, () => ({
    focus: () => {
      editorRef.current?.focus();
    },
    getContent: () => {
      return editorRef.current?.innerHTML ?? '';
    },
    setContent: (html: string) => {
      if (editorRef.current) {
        // Low risk for XSS as this input is localized to the user's editor
        // Sanitization must be performed server side before committing message
        // eslint-disable-next-line no-unsanitized/property
        editorRef.current.innerHTML = html;
        onChange?.();
      }
    },
    clear: () => {
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
        onChange?.();
      }
    },
    isEmpty: () => {
      // TODO: Verify if this works on browsers other than Chrome
      let content = editorRef.current?.innerHTML ?? '';
      content = content.replace(/<br\s*\/?>/gi, '');
      return content.trim() === '';
    },
  }));

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!event.shiftKey && event.key === keys.ENTER) {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <div
      ref={editorRef}
      id={editorId}
      contentEditable={!disabled}
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
      onKeyDown={handleKeyDown}
      suppressContentEditableWarning={true}
    />
  );
};
