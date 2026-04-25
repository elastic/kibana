/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useConversationContext } from '../../context/conversation/conversation_context';
import { useConversationId } from '../../context/conversation/use_conversation_id';
import { useConversationTitle } from '../../hooks/use_conversation';

export interface BaseDeleteConversationModalProps {
  onClose: () => void;
  conversationId: string;
  title: string;
  onDelete: (conversationId: string) => Promise<void>;
}

export const BaseDeleteConversationModal: React.FC<BaseDeleteConversationModalProps> = ({
  onClose,
  conversationId,
  title,
  onDelete,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const confirmModalTitleId = useGeneratedHtmlId({ prefix: 'deleteConversationModal' });

  const handleDelete = useCallback(async () => {
    if (!conversationId) {
      return;
    }
    setIsLoading(true);
    try {
      await onDelete(conversationId);
      onClose();
    } catch {
      setIsLoading(false);
    }
  }, [conversationId, onDelete, onClose]);

  if (!conversationId) {
    return null;
  }

  return (
    <EuiConfirmModal
      maxWidth="400px"
      aria-labelledby={confirmModalTitleId}
      title={
        <FormattedMessage
          id="xpack.agentBuilder.conversationTitle.deleteConversationModal.title"
          defaultMessage="Delete this chat"
        />
      }
      titleProps={{ id: confirmModalTitleId }}
      onCancel={onClose}
      onConfirm={handleDelete}
      cancelButtonText={
        <FormattedMessage
          id="xpack.agentBuilder.conversationTitle.deleteConversationModal.cancelButton"
          defaultMessage="Cancel"
        />
      }
      confirmButtonText={
        <FormattedMessage
          id="xpack.agentBuilder.conversationTitle.deleteConversationModal.confirmButton"
          defaultMessage="Delete"
        />
      }
      buttonColor="danger"
      defaultFocusedButton="confirm"
      isLoading={isLoading}
    >
      <p>
        <FormattedMessage
          id="xpack.agentBuilder.conversationTitle.deleteConversationModal.description"
          defaultMessage="Are you sure you want to delete the conversation {title}? This action cannot be undone."
          values={{
            title: <strong>{title || ''}</strong>,
          }}
        />
      </p>
    </EuiConfirmModal>
  );
};

interface DeleteConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeleteConversationModal: React.FC<DeleteConversationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const conversationId = useConversationId();
  const { title } = useConversationTitle();
  const { conversationActions } = useConversationContext();

  if (!isOpen || !conversationId) {
    return null;
  }

  return (
    <BaseDeleteConversationModal
      onClose={onClose}
      conversationId={conversationId}
      title={title || ''}
      onDelete={conversationActions.deleteConversation}
    />
  );
};
