/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiConfirmModal, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import { AGENT_BUILDER_EVENT_TYPES, AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { useDeleteOAuthClient } from '../../hooks/oauth_clients/use_delete_oauth_client';
import { useKibana } from '../../hooks/use_kibana';
import { useToasts } from '../../hooks/use_toasts';
import { labels } from '../../utils/i18n';

export interface DeleteMcpClientModalProps {
  clientId: string;
  clientName: string;
  onClose: () => void;
}

export const DeleteMcpClientModal = ({
  clientId,
  clientName,
  onClose,
}: DeleteMcpClientModalProps) => {
  const { deleteOAuthClient, isDeleting } = useDeleteOAuthClient();
  const { addSuccessToast, addErrorToast } = useToasts();
  const modalTitleId = useGeneratedHtmlId({ prefix: 'deleteMcpClientModalTitle' });
  const {
    services: { analytics },
  } = useKibana();

  const handleDelete = useCallback(async () => {
    analytics.reportEvent(AGENT_BUILDER_EVENT_TYPES.UiClick, {
      ebt_element: AGENT_BUILDER_UI_EBT.element.pageContent,
      ebt_action: AGENT_BUILDER_UI_EBT.action.globalManagement.MCP_CLIENT_DELETE_CONFIRM,
      ebt_detail: AGENT_BUILDER_UI_EBT.entity.MCP_CLIENT,
      element_kind: 'button',
    });
    try {
      await deleteOAuthClient({ clientId });
      addSuccessToast({
        title: labels.tools.mcpClients.delete.successToast(clientName),
      });
      onClose();
    } catch (error) {
      addErrorToast({
        title: labels.tools.mcpClients.delete.errorToast,
        text: formatAgentBuilderErrorMessage(error),
      });
    }
  }, [analytics, deleteOAuthClient, clientId, clientName, onClose, addSuccessToast, addErrorToast]);

  return (
    <EuiConfirmModal
      title={labels.tools.mcpClients.delete.title(clientName)}
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      onCancel={onClose}
      onConfirm={handleDelete}
      isLoading={isDeleting}
      cancelButtonText={labels.tools.mcpClients.delete.cancelButton}
      confirmButtonText={labels.tools.mcpClients.delete.deleteButton}
      buttonColor="danger"
      data-test-subj="mcpClientDeleteModal"
    >
      <EuiText>{labels.tools.mcpClients.delete.confirmationText}</EuiText>
    </EuiConfirmModal>
  );
};
