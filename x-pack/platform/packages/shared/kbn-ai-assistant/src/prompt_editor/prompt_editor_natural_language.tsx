/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import { css } from '@emotion/css';
import { EuiInputPopover, EuiSelectable, EuiTextArea } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MessageRole } from '@kbn/observability-ai-assistant-plugin/public';
import type { Message, MessageAttachment } from '@kbn/observability-ai-assistant-plugin/common';

interface Props {
  disabled: boolean;
  prompt: string | undefined;
  lastUsedPrompts: string[];
  onChange: (message: Message['message']) => void;
  onAttachmentAdd: (attachment: MessageAttachment) => void;
  onChangeHeight: () => void;
  onFocus: () => void;
  onBlur: () => void;
}

const inputPopoverClassName = css`
  max-inline-size: 100%;
`;

const textAreaClassName = css`
  max-height: 200px;
  width: 100%;
`;

const selectableClassName = css`
  .euiSelectableListItem__icon {
    display: none;
  }
`;

export function PromptEditorNaturalLanguage({
  disabled,
  prompt,
  lastUsedPrompts,
  onChange,
  onChangeHeight,
  onAttachmentAdd,
  onFocus,
  onBlur,
}: Props) {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const [isSelectablePopoverOpen, setSelectablePopoverOpen] = useState(false);

  const [imagesUploading, setImagesUploading] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleResizeTextArea();

    onChange({
      role: MessageRole.User,
      content: event.currentTarget.value,
    });
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    const pastedImages = Array.from(event.clipboardData.items).filter(
      (item) => item.type.startsWith('image/') || item.getAsFile()?.type.startsWith('image/')
    );

    if (pastedImages.length) {
      setImagesUploading(true);
      Promise.all(
        pastedImages.map((imageItem) => {
          const file = imageItem.getAsFile();
          if (!file) {
            return undefined;
          }

          const reader = new FileReader();
          reader.addEventListener('load', () => {
            onAttachmentAdd({
              type: 'image',
              title: file.name,
              source: {
                data: reader.result!.toString(),
                mimeType: file.type,
              },
            });
          });
          reader.readAsDataURL(file);
        })
      ).finally(() => {
        setImagesUploading(false);
      });
    }
  };

  const handleResizeTextArea = useCallback(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.minHeight = 'auto';

      const cappedHeight = Math.min(textAreaRef.current?.scrollHeight, 350);

      textAreaRef.current.style.minHeight = cappedHeight + 'px';

      onChangeHeight?.();
    }
  }, [onChangeHeight]);

  const handleKeydown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // only trigger select when no prompt is available
    if (!prompt && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      setSelectablePopoverOpen(true);
    }
  };

  const handleSelectOption = (_: any, __: any, selectedOption: { label: string }) => {
    onChange({
      role: MessageRole.User,
      content: selectedOption.label,
    });
    setSelectablePopoverOpen(false);
  };

  const handleClosePopover = () => {
    setSelectablePopoverOpen(false);
    onFocus();
  };

  useEffect(() => {
    const textarea = textAreaRef.current;

    if (textarea) {
      textarea.focus();
    }
  }, []);

  useEffect(() => {
    handleResizeTextArea();
  }, [handleResizeTextArea]);

  useEffect(() => {
    if (prompt === undefined) {
      handleResizeTextArea();
    }
  }, [handleResizeTextArea, prompt]);

  useEffect(() => {
    // Attach the event listener to the window to catch mouseup outside the browser window
    window.addEventListener('mouseup', handleResizeTextArea);

    return () => {
      window.removeEventListener('mouseup', handleResizeTextArea);
    };
  }, [handleResizeTextArea]);

  return (
    <EuiInputPopover
      display="flex"
      isOpen={isSelectablePopoverOpen}
      closePopover={handleClosePopover}
      className={inputPopoverClassName}
      input={
        <EuiTextArea
          className={textAreaClassName}
          data-test-subj="observabilityAiAssistantChatPromptEditorTextArea"
          disabled={disabled || imagesUploading}
          fullWidth
          inputRef={textAreaRef}
          placeholder={i18n.translate('xpack.aiAssistant.prompt.placeholder', {
            defaultMessage: 'Send a message to the Assistant',
          })}
          resize="vertical"
          rows={1}
          value={prompt || ''}
          onChange={handleChange}
          onFocus={onFocus}
          onKeyDown={handleKeydown}
          onBlur={onBlur}
          onPaste={handlePaste}
        />
      }
      panelMinWidth={300}
      anchorPosition="downLeft"
    >
      <EuiSelectable
        aria-label={i18n.translate(
          'xpack.aiAssistant.promptEditorNaturalLanguage.euiSelectable.selectAnOptionLabel',
          { defaultMessage: 'Select an option' }
        )}
        className={selectableClassName}
        options={lastUsedPrompts.map((label) => ({ label }))}
        searchable
        singleSelection
        onChange={handleSelectOption}
      >
        {(list) => <>{list}</>}
      </EuiSelectable>
    </EuiInputPopover>
  );
}
