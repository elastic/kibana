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

interface KiDeleteConfirmModalProps {
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

export const KiDeleteConfirmModal = ({
  onClose,
  onConfirm,
  isLoading = false,
}: KiDeleteConfirmModalProps) => {
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      title={i18n.translate('xpack.contextEngine.viewKi.deleteModal.title', {
        defaultMessage: 'Delete this Knowledge Indicator?',
      })}
      onCancel={onClose}
      onConfirm={onConfirm}
      confirmButtonDisabled={isLoading}
      isLoading={isLoading}
      buttonColor="danger"
      defaultFocusedButton="cancel"
      cancelButtonText={i18n.translate('xpack.contextEngine.viewKi.deleteModal.cancelButton', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.contextEngine.viewKi.deleteModal.confirmButton', {
        defaultMessage: 'Delete',
      })}
      data-test-subj="contextViewKiDeleteConfirmModal"
    >
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.contextEngine.viewKi.deleteModal.body"
            defaultMessage="It will no longer be retrieved by agents or shown by default. You can restore it later from this page."
          />
        </p>
      </EuiText>
    </EuiConfirmModal>
  );
};
