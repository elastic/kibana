/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Storybook mock — replaces MessageEditor to avoid Kibana plugin context deps.
// Uses the same style hooks as the real component so rendering is 1:1.

import React, { useRef } from 'react';
import {
  useEditorFontStyles,
  useImagePlaceholderStyles,
} from '../message_editor/use_editor_styles';

export class CommandBadgeSerializationError extends Error {}

export const useMessageEditor = (_opts?: { onEditorFocus?: () => void }) => {
  const ref = useRef<HTMLDivElement>(null);
  const messageEditor = { ref };
  const controller = {
    isEmpty: false,
    getContent: () => '',
    clear: () => {},
    setContent: (_c: string) => {},
    focus: () => ref.current?.focus(),
    dismissActionMenu: () => {},
  };
  return { messageEditor, controller };
};

interface MessageEditorProps {
  messageEditor: { ref: React.RefObject<HTMLDivElement> };
  onSubmit?: () => void;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  onPasteFile?: (file: File) => void;
  insertImagePlaceholderOnPaste?: boolean;
  [key: string]: unknown;
}

export const MessageEditor: React.FC<MessageEditorProps> = ({
  messageEditor,
  disabled,
  placeholder,
  ariaLabel,
}) => {
  const fontStyles = useEditorFontStyles();
  const imagePlaceholderStyles = useImagePlaceholderStyles();

  return (
    <div
      ref={messageEditor.ref}
      contentEditable={!disabled}
      suppressContentEditableWarning
      aria-label={ariaLabel}
      data-placeholder={placeholder}
      data-test-subj="agentBuilderConversationInputEditor"
      css={[fontStyles, imagePlaceholderStyles]}
      style={{ minHeight: 24, outline: 'none', padding: '4px 0', color: 'inherit' }}
    />
  );
};
