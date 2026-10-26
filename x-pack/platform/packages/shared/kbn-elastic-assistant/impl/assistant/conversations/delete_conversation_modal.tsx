/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { findIndex, isEmpty } from 'lodash';
import type { Conversation } from '../../..';
import * as i18n from './conversation_sidepanel/translations';

interface Props {
  conversationList: Conversation[];
  currentConversationId?: string;
  deleteConversationItem: Conversation | null;
  onConversationDeleted: (conversationId: string) => void;
  onConversationSelected: ({ cId }: { cId: string }) => void;
  setDeleteConversationItem: React.Dispatch<React.SetStateAction<Conversation | null>>;
}
const getCurrentConversationIndex = (
  conversationList: Conversation[],
  currentConversation: Conversation
) =>
  findIndex(conversationList, (c) =>
    !isEmpty(c.id) ? c.id === currentConversation?.id : c.title === currentConversation?.title
  );

const getNextConversation = (
  conversationList: Conversation[],
  currentConversation?: Conversation
) => {
  const conversationIndex = currentConversation
    ? getCurrentConversationIndex(conversationList, currentConversation)
    : 0;

  return conversationIndex >= conversationList.length - 1
    ? conversationList[0]
    : conversationList[conversationIndex + 1];
};

export const DeleteConversationModal: React.FC<Props> = ({
  conversationList,
  currentConversationId,
  deleteConversationItem,
  onConversationDeleted,
  onConversationSelected,
  setDeleteConversationItem,
}) => {
  const confirmModalTitleId = useGeneratedHtmlId();
  // Callback for when user deletes a conversation
  const onDelete = useCallback(
    (conversation: Conversation) => {
      if (currentConversationId === conversation.id) {
        const previousConversation = getNextConversation(conversationList, conversation);
        onConversationSelected({
          cId: previousConversation.id,
        });
      }
      onConversationDeleted(conversation.id);
    },
    [currentConversationId, onConversationDeleted, conversationList, onConversationSelected]
  );

  const handleCloseModal = useCallback(() => {
    setDeleteConversationItem(null);
  }, [setDeleteConversationItem]);

  const handleDelete = useCallback(() => {
    if (deleteConversationItem) {
      setDeleteConversationItem(null);
      onDelete(deleteConversationItem);
    }
  }, [deleteConversationItem, onDelete, setDeleteConversationItem]);

  return (
    deleteConversationItem && (
      <EuiConfirmModal
        aria-labelledby={confirmModalTitleId}
        title={i18n.DELETE_CONVERSATION_TITLE}
        titleProps={{ id: confirmModalTitleId }}
        onCancel={handleCloseModal}
        onConfirm={handleDelete}
        cancelButtonText={i18n.CANCEL_BUTTON_TEXT}
        confirmButtonText={i18n.DELETE_BUTTON_TEXT}
        buttonColor="danger"
        defaultFocusedButton="confirm"
      />
    )
  );
};
