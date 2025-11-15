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
import { useConversationContext } from '../context/conversation/conversation_context';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { useConversationTitle } from './use_conversation';

export const useRenameConversationModal = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const conversationId = useConversationId();
  const { title } = useConversationTitle();
  const { conversationActions } = useConversationContext();
  const renameModalTitleId = useGeneratedHtmlId({ prefix: 'renameConversationModal' });

  // Reset newTitle when title changes
  useEffect(() => {
    if (title) {
      setNewTitle(title);
    }
  }, [title]);

  const handleRename = useCallback(async () => {
    if (!conversationId || !newTitle.trim()) {
      return;
    }
    setIsLoading(true);
    await conversationActions.renameConversation(conversationId, newTitle.trim());
    setIsLoading(false);
    setShowRenameModal(false);
  }, [conversationId, newTitle, conversationActions]);

  const openRenameModal = useCallback(() => {
    setNewTitle(title || '');
    setShowRenameModal(true);
  }, [title]);

  const closeRenameModal = useCallback(() => {
    setShowRenameModal(false);
    setNewTitle(title || '');
  }, [title]);

  const RenameModal: React.ReactElement | null =
    showRenameModal && conversationId ? (
      <EuiConfirmModal
        aria-labelledby={renameModalTitleId}
        title={
          <FormattedMessage
            id="xpack.onechat.conversationTitle.renameConversationModal.title"
            defaultMessage="Rename conversation"
          />
        }
        titleProps={{ id: renameModalTitleId }}
        onCancel={closeRenameModal}
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
    ) : null;

  return {
    openRenameModal,
    RenameModal,
  };
};
