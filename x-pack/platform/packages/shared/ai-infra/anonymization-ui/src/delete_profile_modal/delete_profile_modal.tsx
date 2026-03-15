/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiConfirmModal, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface DeleteProfileModalProps {
  isDeleting: boolean;
  errorMessage?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeleteProfileModal = ({
  isDeleting,
  errorMessage,
  onCancel,
  onConfirm,
}: DeleteProfileModalProps) => {
  return (
    <EuiConfirmModal
      title={i18n.translate('anonymizationUi.profiles.deleteModal.title', {
        defaultMessage: 'Delete profile',
      })}
      aria-label={i18n.translate('anonymizationUi.profiles.deleteModal.ariaLabel', {
        defaultMessage: 'Delete profile',
      })}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={i18n.translate('anonymizationUi.profiles.deleteModal.cancelButton', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('anonymizationUi.profiles.deleteModal.confirmButton', {
        defaultMessage: 'Delete',
      })}
      buttonColor="danger"
      confirmButtonDisabled={isDeleting}
      data-test-subj="anonymizationProfilesDeleteConfirmModal"
    >
      <p>
        {i18n.translate('anonymizationUi.profiles.deleteModal.body', {
          defaultMessage: 'This action cannot be undone.',
        })}
      </p>
      {errorMessage && (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut announceOnMount color="danger" iconType="warning" title={errorMessage} />
        </>
      )}
    </EuiConfirmModal>
  );
};
