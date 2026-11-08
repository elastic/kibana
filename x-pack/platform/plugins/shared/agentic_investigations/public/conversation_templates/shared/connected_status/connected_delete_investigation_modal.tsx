/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiConfirmModal, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useQueryClient } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { DeleteInvestigationModalRenderProps } from '@kbn/agentic-investigations-common';
import { escalationQueryKeys } from '../../../escalations/query_keys';

/** Investigations are Agent Builder conversations; this public API deletes one. */
const AGENT_BUILDER_CONVERSATIONS_URL = '/api/agent_builder/conversations';
const AGENT_BUILDER_PUBLIC_API_VERSION = '2023-10-31';

/**
 * Confirms and deletes the investigation's Agent Builder conversation. Same API as the Nightshift
 * card Delete action; after success the home lists and this flyout's sources refresh.
 */
export const ConnectedDeleteInvestigationModal: React.FC<DeleteInvestigationModalRenderProps> = ({
  investigation,
  onClose,
}) => {
  const { services } = useKibana<CoreStart>();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const titleId = useGeneratedHtmlId({ prefix: 'deleteInvestigation' });
  const conversationId = investigation.conversationId ?? investigation.id;

  const handleConfirm = useCallback(async () => {
    setIsDeleting(true);
    try {
      await services.http.delete(
        `${AGENT_BUILDER_CONVERSATIONS_URL}/${encodeURIComponent(conversationId)}`,
        { version: AGENT_BUILDER_PUBLIC_API_VERSION }
      );
      services.notifications?.toasts.addSuccess({
        title: i18n.translate('xpack.agenticInvestigations.deleteInvestigation.successToastTitle', {
          defaultMessage: 'Investigation deleted',
        }),
      });
      onClose();
    } catch (error) {
      services.notifications?.toasts.addError(error as Error, {
        title: i18n.translate('xpack.agenticInvestigations.deleteInvestigation.errorToastTitle', {
          defaultMessage: 'Could not delete the investigation',
        }),
      });
    } finally {
      // Escalation queues, proposal lists, and Nightshift home sections all key off these.
      void queryClient.invalidateQueries({ queryKey: escalationQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['nightshift.investigations'] });
      setIsDeleting(false);
    }
  }, [conversationId, onClose, queryClient, services.http, services.notifications?.toasts]);

  return (
    <EuiConfirmModal
      aria-labelledby={titleId}
      titleProps={{ id: titleId }}
      title={i18n.translate('xpack.agenticInvestigations.deleteInvestigation.confirmTitle', {
        defaultMessage: 'Delete investigation?',
      })}
      onCancel={onClose}
      onConfirm={handleConfirm}
      cancelButtonText={i18n.translate(
        'xpack.agenticInvestigations.deleteInvestigation.cancelButton',
        { defaultMessage: 'Cancel' }
      )}
      confirmButtonText={i18n.translate(
        'xpack.agenticInvestigations.deleteInvestigation.confirmButton',
        { defaultMessage: 'Delete investigation' }
      )}
      buttonColor="danger"
      defaultFocusedButton="cancel"
      isLoading={isDeleting}
      data-test-subj="investigationFlyoutDeleteConfirm"
    >
      <EuiText size="s">
        <p>
          {i18n.translate('xpack.agenticInvestigations.deleteInvestigation.confirmBody', {
            defaultMessage:
              '"{title}" and its conversation will be permanently deleted. This cannot be undone.',
            values: { title: investigation.title },
          })}
        </p>
      </EuiText>
    </EuiConfirmModal>
  );
};
