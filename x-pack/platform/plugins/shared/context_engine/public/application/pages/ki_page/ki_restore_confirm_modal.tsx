/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

interface KiRestoreConfirmModalProps {
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

export const KiRestoreConfirmModal = ({
  onClose,
  onConfirm,
  isLoading = false,
}: KiRestoreConfirmModalProps) => {
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      title={i18n.translate('xpack.contextEngine.viewKi.restoreModal.title', {
        defaultMessage: 'Restore this Knowledge Indicator?',
      })}
      onCancel={onClose}
      onConfirm={onConfirm}
      confirmButtonDisabled={isLoading}
      isLoading={isLoading}
      buttonColor="primary"
      defaultFocusedButton="cancel"
      cancelButtonText={i18n.translate('xpack.contextEngine.viewKi.restoreModal.cancelButton', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.contextEngine.viewKi.restoreModal.confirmButton', {
        defaultMessage: 'Restore',
      })}
      data-test-subj="contextViewKiRestoreConfirmModal"
    >
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.contextEngine.viewKi.restoreModal.body"
            defaultMessage="It can be retrieved again."
          />
        </p>
      </EuiText>
    </EuiConfirmModal>
  );
};
