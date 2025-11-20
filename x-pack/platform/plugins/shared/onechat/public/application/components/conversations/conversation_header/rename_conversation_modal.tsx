/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, EuiFieldText, useGeneratedHtmlId } from '@elastic/eui';
import React, { useCallback, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import { useConversationTitle } from '../../../hooks/use_conversation';

interface RenameConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RenameConversationModal: React.FC<RenameConversationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const conversationId = useConversationId();
  const { title } = useConversationTitle();
  const { conversationActions } = useConversationContext();
  const renameModalTitleId = useGeneratedHtmlId({ prefix: 'renameConversationModal' });

  // Reset newTitle when title changes or modal opens
  useEffect(() => {
    if (title) {
      setNewTitle(title);
    }
  }, [title, isOpen]);

  const handleRename = useCallback(async () => {
    if (!conversationId || !newTitle.trim()) {
      return;
    }
    setIsLoading(true);
    await conversationActions.renameConversation(conversationId, newTitle.trim());
    setIsLoading(false);
    onClose();
  }, [conversationId, newTitle, conversationActions, onClose]);

  const handleCancel = useCallback(() => {
    setNewTitle(title || '');
    onClose();
  }, [title, onClose]);

  if (!isOpen || !conversationId) {
    return null;
  }

  return (
    <EuiConfirmModal
      aria-labelledby={renameModalTitleId}
      title={
        <FormattedMessage
          id="xpack.onechat.conversationTitle.renameConversationModal.title"
          defaultMessage="Rename conversation"
        />
      }
      titleProps={{ id: renameModalTitleId }}
      onCancel={handleCancel}
      onConfirm={handleRename}
      cancelButtonText={
        <FormattedMessage
          id="xpack.onechat.conversationTitle.renameConversationModal.cancelButton"
          defaultMessage="Cancel"
        />
      }
      confirmButtonText={
        <FormattedMessage
          id="xpack.onechat.conversationTitle.renameConversationModal.confirmButton"
          defaultMessage="Rename"
        />
      }
      defaultFocusedButton="confirm"
      isLoading={isLoading}
    >
      <EuiFieldText
        value={newTitle}
        onChange={(e) => setNewTitle(e.target.value)}
        placeholder={i18n.translate(
          'xpack.onechat.conversationTitle.renameConversationModal.inputPlaceholder',
          {
            defaultMessage: 'Enter conversation name',
          }
        )}
        fullWidth
        autoFocus
        data-test-subj="renameConversationInput"
      />
    </EuiConfirmModal>
  );
};
