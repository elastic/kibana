/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFieldText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { formatOnechatErrorMessage } from '@kbn/onechat-browser';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import { useConversationTitle } from '../../../hooks/use_conversation';
import { useToasts } from '../../../hooks/use_toasts';

const labels = {
  inputPlaceholder: i18n.translate('xpack.onechat.renameConversationInput.inputPlaceholder', {
    defaultMessage: 'Enter conversation name',
  }),
  confirmButton: i18n.translate('xpack.onechat.renameConversationInput.confirmButton', {
    defaultMessage: 'Confirm rename',
  }),
  cancelButton: i18n.translate('xpack.onechat.renameConversationInput.cancelButton', {
    defaultMessage: 'Cancel rename',
  }),
  renameErrorToast: i18n.translate('xpack.onechat.renameConversationInput.renameErrorToast', {
    defaultMessage: 'Failed to rename conversation',
  }),
};

const INPUT_WIDTH = '240px';

const inputWidthStyles = css`
  width: ${INPUT_WIDTH};
`;

interface RenameConversationInputProps {
  onCancel: () => void;
}

export const RenameConversationInput: React.FC<RenameConversationInputProps> = ({ onCancel }) => {
  const conversationId = useConversationId();
  const { title } = useConversationTitle();
  const { conversationActions } = useConversationContext();
  const { addErrorToast } = useToasts();
  const [isLoading, setIsLoading] = useState(false);
  const [newTitle, setNewTitle] = useState(title || '');
  const hasFocusedRef = useRef(false);

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

  const handleRename = useCallback(async () => {
    if (!conversationId || !newTitle.trim() || !isFormDirty) {
      return;
    }
    setIsLoading(true);
    try {
      await conversationActions.renameConversation(conversationId, newTitle.trim());
      onCancel();
    } catch (error) {
      addErrorToast({
        title: labels.renameErrorToast,
        text: formatOnechatErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, newTitle, conversationActions, onCancel, isFormDirty, addErrorToast]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (isFormDirty && newTitle.trim()) {
          handleRename();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    },
    [handleRename, onCancel, isFormDirty, newTitle]
  );

  if (!conversationId) {
    return null;
  }

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false} css={inputWidthStyles}>
        <EuiFieldText
          inputRef={inputRefCallback}
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={labels.inputPlaceholder}
          isInvalid={!newTitle.trim()}
          isLoading={isLoading}
          disabled={isLoading}
          data-test-subj="renameConversationInput"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="check"
          aria-label={labels.confirmButton}
          onClick={handleRename}
          color="success"
          isDisabled={!newTitle.trim() || isLoading || !isFormDirty}
          data-test-subj="renameConversationConfirmButton"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="cross"
          aria-label={labels.cancelButton}
          onClick={onCancel}
          color="danger"
          isDisabled={isLoading}
          data-test-subj="renameConversationCancelButton"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
