/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';

interface AutomationDeleteConfirmModalProps {
  name: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export const AutomationDeleteConfirmModal = ({
  name,
  onCancel,
  onConfirm,
}: AutomationDeleteConfirmModalProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const modalTitleId = useGeneratedHtmlId();

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      title={i18n.translate('xpack.contextEngine.aiIndexDetail.automations.deleteModal.title', {
        defaultMessage: 'Remove "{name}"?',
        values: { name },
      })}
      onCancel={onCancel}
      onConfirm={handleConfirm}
      confirmButtonDisabled={isDeleting}
      isLoading={isDeleting}
      buttonColor="danger"
      cancelButtonText={i18n.translate(
        'xpack.contextEngine.aiIndexDetail.automations.deleteModal.cancelButton',
        { defaultMessage: 'Cancel' }
      )}
      confirmButtonText={i18n.translate(
        'xpack.contextEngine.aiIndexDetail.automations.deleteModal.confirmButton',
        { defaultMessage: 'Remove' }
      )}
      data-test-subj="contextAutomationDeleteConfirmModal"
    >
      <EuiText size="s">
        <p>
          {i18n.translate('xpack.contextEngine.aiIndexDetail.automations.deleteModal.body', {
            defaultMessage:
              'This removes the automation from this AI index. The workflow itself is not deleted.',
          })}
        </p>
      </EuiText>
    </EuiConfirmModal>
  );
};
