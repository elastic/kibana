/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCheckbox,
  EuiCode,
  EuiConfirmModal,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import type { AiIndexHttpItem } from '../../../../common/http_api/ai_indices';
import { useDeleteAiIndex } from '../../hooks/use_delete_ai_index';
import { useKibana } from '../../hooks/use_kibana';

interface AiIndexDeleteConfirmModalProps {
  aiIndex: AiIndexHttpItem;
  onClose: () => void;
  onSuccess: () => void;
}

export const AiIndexDeleteConfirmModal = ({
  aiIndex,
  onClose,
  onSuccess,
}: AiIndexDeleteConfirmModalProps) => {
  const {
    services: { notifications, application },
  } = useKibana();
  const { deleteAiIndex, isDeleting } = useDeleteAiIndex();
  const canDeleteWorkflows = Boolean(application.capabilities.workflowsManagement?.deleteWorkflow);
  const automationsCount = aiIndex.automations.length;
  const [deleteKnowledgeIndicators, setDeleteKnowledgeIndicators] = useState(true);
  const [deleteAutomations, setDeleteAutomations] = useState(
    automationsCount > 0 && canDeleteWorkflows
  );
  const [error, setError] = useState<string | null>(null);
  const modalTitleId = useGeneratedHtmlId();
  const kiCheckboxId = useGeneratedHtmlId();
  const automationsCheckboxId = useGeneratedHtmlId();

  const onConfirm = async () => {
    setError(null);
    try {
      const result = await deleteAiIndex({
        aiIndexId: aiIndex.id,
        deleteKnowledgeIndicators,
        deleteAutomations: deleteAutomations && canDeleteWorkflows,
      });

      if (result.errors.length > 0) {
        for (const errorMessage of result.errors) {
          notifications.toasts.addWarning({
            title: i18n.translate('xpack.contextEngine.landing.deleteModal.partialFailureTitle', {
              defaultMessage:
                '"{name}" was deleted, but some related resources could not be removed',
              values: { name: aiIndex.id },
            }),
            text: errorMessage,
          });
        }
      } else {
        notifications.toasts.addSuccess(
          i18n.translate('xpack.contextEngine.landing.deleteModal.successToast', {
            defaultMessage: '"{name}" deleted',
            values: { name: aiIndex.id },
          })
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return;
    }

    onClose();
    onSuccess();
  };

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      title={i18n.translate('xpack.contextEngine.landing.deleteModal.title', {
        defaultMessage: 'Delete "{name}"?',
        values: { name: aiIndex.id },
      })}
      onCancel={onClose}
      onConfirm={onConfirm}
      cancelButtonText={i18n.translate('xpack.contextEngine.landing.deleteModal.cancelButton', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.contextEngine.landing.deleteModal.confirmButton', {
        defaultMessage: 'Delete AI index',
      })}
      buttonColor="danger"
      isLoading={isDeleting}
      data-test-subj="contextAiIndexDeleteConfirmModal"
    >
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.contextEngine.landing.deleteModal.description"
            defaultMessage="This permanently deletes the AI index entry. Connected agents will stop retrieving from it."
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiCheckbox
        id={kiCheckboxId}
        data-test-subj="contextAiIndexDeleteKiCheckbox"
        checked={deleteKnowledgeIndicators}
        onChange={(event) => setDeleteKnowledgeIndicators(event.target.checked)}
        label={
          <FormattedMessage
            id="xpack.contextEngine.landing.deleteModal.kiCheckbox"
            defaultMessage="Also delete the backing index {index} and its Knowledge Indicators"
            values={{
              index: <EuiCode>{aiIndex.dest.value}</EuiCode>,
            }}
          />
        }
      />
      <EuiSpacer size="s" />
      <EuiCheckbox
        id={automationsCheckboxId}
        data-test-subj="contextAiIndexDeleteAutomationsCheckbox"
        checked={deleteAutomations}
        disabled={automationsCount === 0 || !canDeleteWorkflows}
        onChange={(event) => setDeleteAutomations(event.target.checked)}
        label={
          <FormattedMessage
            id="xpack.contextEngine.landing.deleteModal.automationsCheckbox"
            defaultMessage="Also delete its {count, plural, one {# automation} other {# automations}}"
            values={{ count: automationsCount }}
          />
        }
      />
      {error !== null && (
        <>
          <EuiSpacer size="m" />
          <EuiText color="danger" size="s" data-test-subj="contextAiIndexDeleteError">
            <p>{error}</p>
          </EuiText>
        </>
      )}
    </EuiConfirmModal>
  );
};
