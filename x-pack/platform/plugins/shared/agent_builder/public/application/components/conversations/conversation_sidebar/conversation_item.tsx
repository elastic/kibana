/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiListGroupItem, EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import type { ConversationWithoutRounds } from '@kbn/agent-builder-common';
import React, { useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../utils/app_paths';
import { useConversationContext } from '../../../context/conversation/conversation_context';

interface ConversationItemProps {
  conversation: ConversationWithoutRounds;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({ conversation }) => {
  const { createAgentBuilderUrl } = useNavigation();
  const currentConversationId = useConversationId();
  const { conversationActions, isEmbeddedContext, setConversationId } = useConversationContext();
  const isActive = currentConversationId === conversation.id;
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const confirmModalTitleId = useGeneratedHtmlId({ prefix: 'deleteConversationModal' });

  const handleDelete = useCallback(async () => {
    setShowDeleteModal(false);
    await conversationActions.deleteConversation(conversation.id);
  }, [conversation.id, conversationActions]);

  const handleClick = useCallback(() => {
    setConversationId?.(conversation.id);
  }, [setConversationId, conversation.id]);

  return (
    <>
      <EuiListGroupItem
        color="text"
        size="s"
        href={
          isEmbeddedContext
            ? undefined
            : createAgentBuilderUrl(appPaths.chat.conversation({ conversationId: conversation.id }))
        }
        onClick={isEmbeddedContext ? handleClick : undefined}
        data-test-subj={`conversationItem-${conversation.id}`}
        label={conversation.title}
        isActive={isActive}
        extraAction={{
          iconType: 'trash',
          color: 'danger',
          'aria-label': i18n.translate(
            'xpack.agentBuilder.conversationItem.deleteConversationIconLabel',
            {
              defaultMessage: 'Delete conversation',
            }
          ),
          onClick: () => setShowDeleteModal(true),
          'data-test-subj': `delete-conversation-button-${conversation.id}`,
        }}
      />
      {showDeleteModal && (
        <EuiConfirmModal
          aria-labelledby={confirmModalTitleId}
          title={
            <FormattedMessage
              id="xpack.agentBuilder.conversationItem.deleteConversationModal.title"
              defaultMessage="Delete conversation"
            />
          }
          titleProps={{ id: confirmModalTitleId }}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          cancelButtonText={
            <FormattedMessage
              id="xpack.agentBuilder.conversationItem.deleteConversationModal.cancelButton"
              defaultMessage="Cancel"
            />
          }
          confirmButtonText={
            <FormattedMessage
              id="xpack.agentBuilder.conversationItem.deleteConversationModal.confirmButton"
              defaultMessage="Delete"
            />
          }
          buttonColor="danger"
          defaultFocusedButton="confirm"
        >
          <p>
            <FormattedMessage
              id="xpack.agentBuilder.conversationItem.deleteConversationModal.description"
              defaultMessage="Are you sure you want to delete the conversation {title}? This action cannot be undone."
              values={{
                title: <strong>{conversation.title}</strong>,
              }}
            />
          </p>
        </EuiConfirmModal>
      )}
    </>
  );
};
