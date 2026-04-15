/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiInlineEditText } from '@elastic/eui';
import React, { useCallback, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import { css } from '@emotion/react';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import { useConversationTitle } from '../../../hooks/use_conversation';
import { useToasts } from '../../../hooks/use_toasts';

const labels = {
  inputPlaceholder: i18n.translate('xpack.agentBuilder.renameConversationInput.inputPlaceholder', {
    defaultMessage: 'Enter conversation name',
  }),
  inputAriaLabel: i18n.translate('xpack.agentBuilder.renameConversationInput.inputAriaLabel', {
    defaultMessage: 'Edit conversation title',
  }),
  renameErrorToast: i18n.translate('xpack.agentBuilder.renameConversationInput.renameErrorToast', {
    defaultMessage: 'Failed to rename conversation',
  }),
};

interface RenameConversationInputProps {
  onCancel: () => void;
}

export const RenameConversationInput: React.FC<RenameConversationInputProps> = ({ onCancel }) => {
  const conversationId = useConversationId();
  const { title } = useConversationTitle();
  const { conversationActions, isEmbeddedContext } = useConversationContext();
  const { addErrorToast } = useToasts();
  const [isLoading, setIsLoading] = useState(false);
  const [newTitle, setNewTitle] = useState(title || '');
  const hasFocusedRef = useRef(false);

  const INPUT_WIDTH = isEmbeddedContext ? '240px' : '340px';

  const inputWidthStyles = css`
    width: ${INPUT_WIDTH};
  `;

  // Callback ref that focuses only on first mount
  const inputRefCallback = useCallback((el: HTMLInputElement | null) => {
    if (el && !hasFocusedRef.current) {
      hasFocusedRef.current = true;
      // Use requestAnimationFrame to ensure the element is fully mounted
      requestAnimationFrame(() => {
        el.focus();
        el.select();
      });
    }
  }, []);

  const isFormDirty = newTitle.trim() !== (title || '').trim();

  const handleSave = useCallback(async () => {
    if (!conversationId || !newTitle.trim() || !isFormDirty) {
      return false; // Return false to prevent EUI from exiting edit mode
    }
    setIsLoading(true);
    try {
      await conversationActions.renameConversation(conversationId, newTitle.trim());
      onCancel();
      return true;
    } catch (error) {
      addErrorToast({
        title: labels.renameErrorToast,
        text: formatAgentBuilderErrorMessage(error),
      });
      return false; // Stay in edit mode on error
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, newTitle, conversationActions, onCancel, isFormDirty, addErrorToast]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    },
    [onCancel]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      // Don't cancel if focus moved to any other element within the component I.e. save/cancel buttons.
      const relatedTarget = e.relatedTarget as HTMLElement | null;
      if (relatedTarget?.closest('[data-test-subj="renameConversationInput"]')) {
        return;
      }
      onCancel();
    },
    [onCancel]
  );

  if (!conversationId) {
    return null;
  }

  return (
    <EuiInlineEditText
      css={inputWidthStyles}
      placeholder={labels.inputPlaceholder}
      size="s"
      value={newTitle}
      onKeyDown={handleKeyDown}
      inputAriaLabel={labels.inputAriaLabel}
      onSave={handleSave}
      onCancel={onCancel}
      onChange={(e) => setNewTitle((e.target as HTMLInputElement).value)}
      isLoading={isLoading}
      startWithEditOpen
      editModeProps={{
        inputProps: {
          inputRef: inputRefCallback,
          onBlur: handleBlur,
          'data-test-subj': 'renameConversationInputField',
        },
        saveButtonProps: {
          isDisabled: !isFormDirty || newTitle.trim() === '',
          'data-test-subj': 'renameConversationSaveButton',
        },
        cancelButtonProps: {
          'data-test-subj': 'renameConversationCancelButton',
        },
      }}
      data-test-subj="renameConversationInput"
    />
  );
};
