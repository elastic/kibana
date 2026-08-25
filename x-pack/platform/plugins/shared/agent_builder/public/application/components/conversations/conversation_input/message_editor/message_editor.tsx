/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { euiTextTruncate, keys, useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { MessageEditorInstance } from './use_message_editor';
import { CommandMenuContainer } from './command_menu';
import type { CommandMenuHandle } from './command_menu';
import {
  COMMAND_BADGE_ATTRIBUTE,
  COMMAND_BADGE_LABEL_ATTRIBUTE,
  COMMAND_BADGE_MAX_WIDTH_CH,
  isElementCommandBadge,
} from './command_badge';
import { serializeEditorContent } from './serialize';
import {
  createImagePlaceholderElement,
  IMAGE_PLACEHOLDER_ATTRIBUTE,
  IMAGE_PLACEHOLDER_REMOVE_ATTRIBUTE,
} from './image_placeholder';
import { useEditorFontStyles, useImagePlaceholderStyles } from './use_editor_styles';
import {
  createTextFragment,
  ensureCaretTargetBeforeFirstBadge,
  getSelectionRange,
  insertNodeAtCursor,
  insertSpaceAfter,
  placeCursorAfter,
} from './utils';

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
 * keeping only badge spans, <br> elements, and text nodes.
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
      } else if (element.tagName === 'BR') {
        fragment.appendChild(document.createElement('br'));
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
  ariaLabel?: string;
  'data-test-subj'?: string;
  /** Called with the pasted file. Returns the name used for the placeholder, or undefined to skip. */
  onPasteFile?: (file: File) => string | undefined;
  /** When true, a chip is inserted at the caret after onPasteFile returns a name. */
  insertImagePlaceholderOnPaste?: boolean;
  /** Called on every editor input event (after onChange). Use to detect placeholder removals. */
  onAfterInput?: () => void;
  /** Called when the pointer enters or leaves an image placeholder span. */
  onHoveredPlaceholderChange?: (name: string | null) => void;
  /** Names of images currently uploading — drives the progress bar on inline placeholder chips. */
  uploadingNames?: ReadonlySet<string>;
}

export const MessageEditor: React.FC<MessageEditorProps> = ({
  messageEditor,
  onSubmit,
  disabled = false,
  placeholder = '',
  ariaLabel,
  'data-test-subj': dataTestSubj,
  onPasteFile,
  insertImagePlaceholderOnPaste = false,
  onAfterInput,
  onHoveredPlaceholderChange,
  uploadingNames,
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
  const fontStyles = useEditorFontStyles();
  const imagePlaceholderStyles = useImagePlaceholderStyles();
  const commandBadgeStyles = css`
    [${COMMAND_BADGE_ATTRIBUTE}] {
      display: inline-flex;
      align-items: baseline;
      color: ${euiTheme.colors.textPrimary};
      background-color: ${euiTheme.colors.backgroundLightPrimary};
      border-radius: ${euiTheme.border.radius.small};
      padding: 0 ${euiTheme.size.xs};
      cursor: default;
      user-select: all;
      max-width: ${COMMAND_BADGE_MAX_WIDTH_CH}ch;
      min-width: 0;
      vertical-align: baseline;
      line-height: inherit;
    }
    [${COMMAND_BADGE_ATTRIBUTE}] [${COMMAND_BADGE_LABEL_ATTRIBUTE}] {
      min-width: 0;
      ${euiTextTruncate('100%')}
    }
  `;
  const editorStyles = [
    heightStyles,
    resetStyles(editorId),
    disabledStyles,
    placeholderStyles,
    fontStyles,
    commandBadgeStyles,
    imagePlaceholderStyles,
  ];

  // Sync data-uploading attribute on chips whenever the uploading set changes.
  // The paste handler also sets data-uploading immediately on insertion (before the React
  // state update propagates), so this effect primarily handles removal when upload finishes.
  useEffect(() => {
    if (!ref.current) return;
    ref.current.querySelectorAll<HTMLElement>(`[${IMAGE_PLACEHOLDER_ATTRIBUTE}]`).forEach((el) => {
      if (uploadingNames?.has(el.dataset.placeholderName ?? '')) {
        el.setAttribute('data-uploading', 'true');
      } else {
        el.removeAttribute('data-uploading');
      }
    });
  }, [uploadingNames, ref]);

  const handleCompositionStart = () => setIsComposing(true);
  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  return (
    <CommandMenuContainer
      commandMatch={commandMatch}
      editorRef={ref}
      onSelect={messageEditor.handleCommandSelect}
      onContentChange={messageEditor.reportMenuContent}
      commandMenuRef={commandMenuRef}
      data-test-subj={`${dataTestSubj}-container`}
    >
      <div
        ref={ref}
        id={editorId}
        contentEditable={disabled ? 'false' : 'true'}
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel ?? editorAriaLabel}
        aria-disabled={disabled}
        aria-haspopup="dialog"
        tabIndex={0}
        data-placeholder={placeholder}
        data-test-subj={dataTestSubj}
        css={editorStyles}
        onInput={() => {
          onChange();
          onAfterInput?.();
        }}
        onMouseDown={(event) => {
          const target = event.target as Element;
          const removeButton = target.closest?.(`[${IMAGE_PLACEHOLDER_REMOVE_ATTRIBUTE}]`);
          if (!removeButton) return;
          const chip = removeButton.closest(`[${IMAGE_PLACEHOLDER_ATTRIBUTE}]`);
          if (!chip) return;
          event.preventDefault();
          chip.remove();
          onChange();
          onAfterInput?.();
        }}
        onMouseOver={(event) => {
          const target = event.target as HTMLElement;
          const placeholderEl = target.closest?.(
            `[${IMAGE_PLACEHOLDER_ATTRIBUTE}]`
          ) as HTMLElement | null;
          onHoveredPlaceholderChange?.(placeholderEl?.dataset.placeholderName ?? null);
        }}
        onMouseLeave={() => onHoveredPlaceholderChange?.(null)}
        onFocus={onFocus}
        onBlur={messageEditor.dismissActionMenu}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onPaste={(event) => {
          if (onPasteFile) {
            const imageItem = Array.from(event.clipboardData.items).find(
              (item) => item.kind === 'file' && item.type.startsWith('image/')
            );
            if (imageItem) {
              event.preventDefault();
              const file = imageItem.getAsFile();
              if (file) {
                const label = onPasteFile(file);
                if (insertImagePlaceholderOnPaste && label) {
                  const chipEl = createImagePlaceholderElement(label);
                  // Mark uploading immediately; the useEffect will clear it once upload finishes.
                  chipEl.setAttribute('data-uploading', 'true');
                  insertNodeAtCursor(chipEl);
                  const sel = window.getSelection();
                  if (sel) {
                    const space = insertSpaceAfter(chipEl);
                    if (space) {
                      placeCursorAfter(space, sel);
                    }
                  }
                  onChange();
                }
              }
              return;
            }
          }

          event.preventDefault();

          const htmlData = event.clipboardData.getData('text/html');
          const textData = event.clipboardData.getData('text/plain');

          const hasBadgeHtml = htmlData && stringContainsBadge(htmlData);
          const node = hasBadgeHtml
            ? sanitizeHtmlIncludeOnlyTextAndBadges(htmlData)
            : createTextFragment(textData);

          insertNodeAtCursor(node);
          if (ref.current) {
            ensureCaretTargetBeforeFirstBadge(ref.current);
          }

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
