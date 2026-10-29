/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

interface RotateTokenModalProps {
  isLoading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const RotateTokenModal = ({
  isLoading = false,
  onCancel,
  onConfirm,
}: RotateTokenModalProps) => {
  const titleId = useGeneratedHtmlId();
  return (
    <EuiConfirmModal
      aria-labelledby={titleId}
      titleProps={{ id: titleId }}
      title={i18n.translate('xpack.alertingV2.imports.rotateModal.title', {
        defaultMessage: 'Rotate token?',
      })}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={i18n.translate('xpack.alertingV2.imports.rotateModal.cancel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.alertingV2.imports.rotateModal.confirm', {
        defaultMessage: 'Rotate token',
      })}
      buttonColor="warning"
      defaultFocusedButton="confirm"
      isLoading={isLoading}
      data-test-subj="importsRotateModal"
    >
      <FormattedMessage
        id="xpack.alertingV2.imports.rotateModal.body"
        defaultMessage="The current token stops working immediately. Your source system needs the new token, and it is shown only once."
      />
    </EuiConfirmModal>
  );
};
