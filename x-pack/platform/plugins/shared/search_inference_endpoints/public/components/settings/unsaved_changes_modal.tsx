/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface UnsavedChangesModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  onConfirm,
  onCancel,
}) => {
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      title={i18n.translate('xpack.searchInferenceEndpoints.settings.unsavedChangesModal.title', {
        defaultMessage: 'Unsaved changes',
      })}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={i18n.translate(
        'xpack.searchInferenceEndpoints.settings.unsavedChangesModal.cancel',
        { defaultMessage: 'Cancel' }
      )}
      confirmButtonText={i18n.translate(
        'xpack.searchInferenceEndpoints.settings.unsavedChangesModal.confirm',
        { defaultMessage: 'Discard changes' }
      )}
      buttonColor="primary"
      data-test-subj="unsavedChangesModal"
    >
      <p>
        {i18n.translate('xpack.searchInferenceEndpoints.settings.unsavedChangesModal.body', {
          defaultMessage: 'Discard changes and leave page?',
        })}
      </p>
    </EuiConfirmModal>
  );
};
