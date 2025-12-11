/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme, keys, useGeneratedHtmlId, useEuiFontSize } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { MessageEditorInstance } from './use_message_editor';
import { MentionHighlightLayer } from './mention_highlight_layer';

const EDITOR_MAX_HEIGHT = 240;

const editorAriaLabel = i18n.translate('xpack.onechat.conversationInput.messageEditor.label', {
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
  const { ref, onChange } = messageEditor._internal;
  const editorId = useGeneratedHtmlId({ prefix: 'messageEditor' });
  const { euiTheme } = useEuiTheme();

  // Track text content for highlight layer
  const [textContent, setTextContent] = useState('');

  const handleInput = useCallback(() => {
    onChange();
    // Update text content for highlight layer
    setTextContent(ref.current?.textContent || '');
  }, [onChange, ref]);

  // Container styles - positions children relatively
  const containerStyles = css`
    position: relative;
    flex-grow: 1;
    height: 100%;
    max-height: ${EDITOR_MAX_HEIGHT}px;
  `;

  // Editor styles
  const heightStyles = css`
    height: 100%;
    overflow-y: auto;
  `;

  const resetStyles = css`
    &#${CSS.escape(editorId)} {
      outline-style: none;
    }
  `;

  const disabledStyles = css`
    &[contenteditable='false'] {
      cursor: not-allowed;
    }
  `;

  const placeholderStyles = css`
    &[data-placeholder]:empty:before {
      content: attr(data-placeholder);
      color: ${euiTheme.colors.subduedText};
      pointer-events: none;
      display: block;
    }
  `;

  const fontSizeStyles = useEuiFontSize('m');
  const fontStyles = css`
    ${fontSizeStyles}
  `;

  // Make editor background transparent so highlight layer shows through
  const transparentBgStyles = css`
    background: transparent;
    position: relative;
    z-index: 1;
  `;

  const editorStyles = [
    heightStyles,
    resetStyles,
    disabledStyles,
    placeholderStyles,
    fontStyles,
    transparentBgStyles,
  ];

  return (
    <div css={containerStyles}>
      <MentionHighlightLayer text={textContent} disabled={disabled} />
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
        onInput={handleInput}
        onKeyDown={(event) => {
          if (!event.shiftKey && event.key === keys.ENTER) {
            event.preventDefault();
            onSubmit();
          }
        }}
      />
    </div>
  );
};
