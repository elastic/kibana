/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface ResetDefaultsModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export const ResetDefaultsModal: React.FC<ResetDefaultsModalProps> = ({ onConfirm, onCancel }) => {
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      title={i18n.translate('xpack.searchInferenceEndpoints.settings.resetModal.title', {
        defaultMessage: 'Reset to defaults',
      })}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={i18n.translate(
        'xpack.searchInferenceEndpoints.settings.resetModal.cancel',
        { defaultMessage: 'Cancel' }
      )}
      confirmButtonText={i18n.translate(
        'xpack.searchInferenceEndpoints.settings.resetModal.confirm',
        { defaultMessage: 'Reset to default' }
      )}
      buttonColor="primary"
      defaultFocusedButton="confirm"
      data-test-subj="resetDefaultsModal"
    >
      <p>
        {i18n.translate('xpack.searchInferenceEndpoints.settings.resetModal.body', {
          defaultMessage:
            'This will discard your custom model selections for this feature and restore the recommended defaults.',
        })}
      </p>
    </EuiConfirmModal>
  );
};
