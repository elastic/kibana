/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  euiTextTruncate,
  keys,
  useEuiFontSize,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { MessageEditorInstance } from './use_message_editor';
import { CommandMenuContainer } from './command_menu';
import type { CommandMenuHandle } from './command_menu';
import {
  COMMAND_BADGE_ATTRIBUTE,
  COMMAND_BADGE_LABEL_ATTRIBUTE,
  COMMAND_BADGE_MAX_WIDTH_CH,
} from './command_badge';
import { serializeEditorContent } from './serialize';
import {
  handleImagePlaceholderRemoveClick,
  syncChipsUploadingState,
  IMAGE_PLACEHOLDER_ATTRIBUTE,
} from './image_placeholder';
import { useImagePlaceholderStyles } from './use_editor_styles';
import { getSelectionRange } from './utils';
import { handleEditorPaste } from './paste_handler';

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

const fragmentContainsBadge = (fragment?: DocumentFragment): boolean => {
  if (!fragment) {
    return false;
  }
  return fragment.querySelector(`[${COMMAND_BADGE_ATTRIBUTE}]`) !== null;
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
  onPasteFile?: (file: File) => string | undefined;
  onAfterInput?: () => void;
  onHoveredPlaceholderChange?: (name: string | null) => void;
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
  const fontStyles = useEuiFontSize('s');
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

  // Flips loading state
  useEffect(() => {
    if (!ref.current) return;
    syncChipsUploadingState(ref.current, uploadingNames);
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
        onMouseDown={(event) =>
          handleImagePlaceholderRemoveClick(event.nativeEvent, { onChange, onAfterInput })
        }
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
        onPaste={(event) =>
          handleEditorPaste(event.nativeEvent, {
            onPasteFile,
            editorRef: ref,
            onChange,
            onAfterInput,
          })
        }
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
