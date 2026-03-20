/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useState } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme, keys, useGeneratedHtmlId, useEuiFontSize } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { MessageEditorInstance } from './use_message_editor';
import { CommandMenuContainer } from './command_menu';
import type { CommandMenuHandle } from './command_menu';
import { COMMAND_BADGE_ATTRIBUTE, isElementCommandBadge } from './command_badge';
import { serializeEditorContent } from './serialize';
import { getSelectionRange, insertNodeAtCursor } from './utils';

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

/**
 * Checks if an HTML string contains badge elements.
 */
const stringContainsBadge = (html: string): boolean => {
  return html.includes(COMMAND_BADGE_ATTRIBUTE);
};

const fragmentContainsBadge = (fragment?: DocumentFragment): boolean => {
  if (!fragment) {
    return false;
  }
  return fragment.querySelector(`[${COMMAND_BADGE_ATTRIBUTE}]`) !== null;
};

/**
 * Sanitizes pasted HTML to only allow badge spans.
 * Uses DOMParser to safely parse HTML, then walks its children,
 * keeping only badge spans and text nodes.
 */
const sanitizeHtmlIncludeOnlyTextAndBadges = (html: string): DocumentFragment => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const fragment = document.createDocumentFragment();

  for (const node of Array.from(doc.body.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      fragment.appendChild(document.createTextNode(node.textContent ?? ''));
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      if (isElementCommandBadge(element)) {
        // Clone the badge span
        fragment.appendChild(element.cloneNode(true));
      } else {
        // Strip other HTML, keep text content
        fragment.appendChild(document.createTextNode(element.textContent ?? ''));
      }
    }
  }

  return fragment;
};

const saveBadgeDataToClipboard = (event: React.ClipboardEvent, fragment: DocumentFragment) => {
  // Create a temp element with the selection contents for serialization
  const temp = document.createElement('div');
  temp.appendChild(fragment);

  // Set plain text as serialized content (markdown format)
  const serialized = serializeEditorContent(temp);
  event.clipboardData.setData('text/plain', serialized);

  // Set HTML to preserve badges for same-editor paste
  event.clipboardData.setData('text/html', temp.innerHTML);
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
  const [isComposing, setIsComposing] = useState(false);
  const commandMenuRef = useRef<CommandMenuHandle>(null);
  const { ref, onChange, onFocus, commandMatch } = messageEditor;
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
  const commandBadgeStyles = css`
    [${COMMAND_BADGE_ATTRIBUTE}] {
      color: ${euiTheme.colors.textPrimary};
      background-color: ${euiTheme.colors.backgroundLightPrimary};
      border-radius: ${euiTheme.border.radius.small};
      padding: 0 ${euiTheme.size.xs};
      cursor: default;
      user-select: all;
    }
  `;
  const editorStyles = [
    heightStyles,
    resetStyles(editorId),
    disabledStyles,
    placeholderStyles,
    fontStyles,
    commandBadgeStyles,
  ];

  const handleCompositionStart = () => setIsComposing(true);
  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  return (
    <CommandMenuContainer
      commandMatch={commandMatch}
      editorRef={ref}
      onSelect={messageEditor.handleCommandSelect}
      commandMenuRef={commandMenuRef}
      data-test-subj={`${dataTestSubj}-container`}
    >
      <div
        ref={ref}
        id={editorId}
        contentEditable={disabled ? 'false' : 'true'}
        role="textbox"
        aria-multiline="true"
        aria-label={editorAriaLabel}
        aria-disabled={disabled}
        aria-haspopup="dialog"
        tabIndex={0}
        data-placeholder={placeholder}
        data-test-subj={dataTestSubj}
        css={editorStyles}
        onInput={onChange}
        onFocus={onFocus}
        onBlur={messageEditor.dismissActionMenu}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onPaste={(event) => {
          event.preventDefault();

          const htmlData = event.clipboardData.getData('text/html');
          const textData = event.clipboardData.getData('text/plain');

          const hasBadgeHtml = htmlData && stringContainsBadge(htmlData);
          const node = hasBadgeHtml
            ? sanitizeHtmlIncludeOnlyTextAndBadges(htmlData)
            : document.createTextNode(textData);

          insertNodeAtCursor(node);

          onChange();
        }}
        onCopy={(event) => {
          const range = getSelectionRange();
          if (!range) {
            return;
          }
          const fragment = range.cloneContents();
          if (fragmentContainsBadge(fragment)) {
            event.preventDefault();
            saveBadgeDataToClipboard(event, fragment);
          }
          // If no badges, let the browser handle copy natively
        }}
        onCut={(event) => {
          // Same logic as copy except it deletes the selection afterwards
          const range = getSelectionRange();
          if (!range) {
            return;
          }
          const fragment = range.cloneContents();
          if (fragmentContainsBadge(fragment)) {
            event.preventDefault();
            saveBadgeDataToClipboard(event, fragment);
            // Delete the selected content
            range.deleteContents();
            onChange();
          }
          // If no badges, let the browser handle cut natively
        }}
        onKeyDown={(event) => {
          if (event.key === keys.ESCAPE) {
            event.stopPropagation();
            messageEditor.dismissActionMenu();
            return;
          }
          if (commandMatch.isActive && commandMenuRef.current?.isKeyDownEventHandled(event)) {
            commandMenuRef.current.handleKeyDown(event);
            event.preventDefault();
            return;
          }
          if (!event.shiftKey && event.key === keys.ENTER && !isComposing) {
            event.preventDefault();
            onSubmit();
          }
        }}
      />
    </CommandMenuContainer>
  );
};
