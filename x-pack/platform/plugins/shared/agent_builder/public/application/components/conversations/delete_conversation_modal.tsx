/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common/telemetry';
import React, { useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useConversationContext } from '../../context/conversation/conversation_context';
import { useConversationId } from '../../context/conversation/use_conversation_id';
import { useConversationTitle } from '../../hooks/use_conversation';
import { useKibana } from '../../hooks/use_kibana';
import { reportAgentBuilderUiClick } from '../../report_agent_builder_ui_click';

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
  const {
    services: {
      analytics,
      appParams: { history },
    },
  } = useKibana();

  const handleDelete = useCallback(async () => {
    if (!conversationId) {
      return;
    }
    reportAgentBuilderUiClick(analytics, {
      ebt_element: AGENT_BUILDER_UI_EBT.element.CONVERSATION_TITLE,
      ebt_action: AGENT_BUILDER_UI_EBT.action.conversation.DELETE_CONFIRM,
      element_kind: 'button',
      location_pathname: history.location.pathname,
    });
    setIsLoading(true);
    try {
      await onDelete(conversationId);
      onClose();
    } catch {
      setIsLoading(false);
    }
  }, [analytics, conversationId, history.location.pathname, onDelete, onClose]);

  const handleCancel = useCallback(() => {
    reportAgentBuilderUiClick(analytics, {
      ebt_element: AGENT_BUILDER_UI_EBT.element.CONVERSATION_TITLE,
      ebt_action: AGENT_BUILDER_UI_EBT.action.conversation.DELETE_CANCEL,
      element_kind: 'button',
      location_pathname: history.location.pathname,
    });
    onClose();
  }, [analytics, history.location.pathname, onClose]);

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
      onCancel={handleCancel}
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
