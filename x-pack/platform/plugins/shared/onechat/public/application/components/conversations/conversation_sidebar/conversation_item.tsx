/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiListGroupItem, EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import type { ConversationWithoutRounds } from '@kbn/onechat-common';
import React, { useCallback, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import { useConversationId } from '../../../hooks/use_conversation_id';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../utils/app_paths';
import { useOnechatServices } from '../../../hooks/use_onechat_service';
import { useConversationActions } from '../../../hooks/use_conversation_actions';

interface ConversationItemProps {
  conversation: ConversationWithoutRounds;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({ conversation }) => {
  const { createOnechatUrl } = useNavigation();
  const currentConversationId = useConversationId();
  const { conversationSettingsService } = useOnechatServices();
  const { setSelectedConversation, deleteConversation } = useConversationActions();
  const isActive = currentConversationId === conversation.id;
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const confirmModalTitleId = useGeneratedHtmlId({ prefix: 'deleteConversationModal' });

  // Subscribe to conversation settings to get the isFlyoutMode
  const conversationSettings = useObservable(
    conversationSettingsService.getConversationSettings$(),
    {}
  );

  const isFlyoutMode = conversationSettings?.isFlyoutMode;

  const handleClick = useCallback(() => {
    setSelectedConversation({ conversationId: conversation.id });
  }, [setSelectedConversation, conversation.id]);

  const handleDelete = useCallback(async () => {
    setShowDeleteModal(false);
    await deleteConversation(conversation.id);
  }, [conversation.id, deleteConversation]);

  const itemProps = isFlyoutMode
    ? {
        onClick: handleClick,
      }
    : {
        href: createOnechatUrl(appPaths.chat.conversation({ conversationId: conversation.id })),
      };

  return (
    <>
      <EuiListGroupItem
        color="text"
        size="s"
        data-test-subj={`conversationItem-${conversation.id}`}
        label={conversation.title}
        isActive={isActive}
        extraAction={{
          iconType: 'trash',
          color: 'danger',
          'aria-label': i18n.translate(
            'xpack.onechat.conversationItem.deleteConversationIconLabel',
            {
              defaultMessage: 'Delete conversation',
            }
          ),
          onClick: () => setShowDeleteModal(true),
          'data-test-subj': 'delete-conversation-button',
        }}
        {...itemProps}
      />
      {showDeleteModal && (
        <EuiConfirmModal
          aria-labelledby={confirmModalTitleId}
          title={i18n.translate('xpack.onechat.conversationItem.deleteConversationModal.title', {
            defaultMessage: 'Delete conversation',
          })}
          titleProps={{ id: confirmModalTitleId }}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          cancelButtonText={i18n.translate(
            'xpack.onechat.conversationItem.deleteConversationModal.cancelButton',
            {
              defaultMessage: 'Cancel',
            }
          )}
          confirmButtonText={i18n.translate(
            'xpack.onechat.conversationItem.deleteConversationModal.confirmButton',
            {
              defaultMessage: 'Delete',
            }
          )}
          buttonColor="danger"
          defaultFocusedButton="confirm"
        >
          <p>
            {i18n.translate('xpack.onechat.conversationItem.deleteConversationModal.description', {
              defaultMessage:
                'Are you sure you want to delete this conversation? This action cannot be undone.',
            })}
          </p>
        </EuiConfirmModal>
      )}
    </>
  );
};
