/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface DisableServiceModalProps {
  serviceName: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
}

export const DisableServiceModal: React.FC<DisableServiceModalProps> = ({
  serviceName,
  onClose,
  onConfirm,
  isLoading,
}) => {
  return (
    <EuiConfirmModal
      title={
        <FormattedMessage
          id="xpack.cloudConnect.services.disable.modalTitle"
          defaultMessage="Disable {serviceName}?"
          values={{ serviceName }}
        />
      }
      onCancel={onClose}
      onConfirm={onConfirm}
      cancelButtonText={
        <FormattedMessage
          id="xpack.cloudConnect.services.disable.cancelButton"
          defaultMessage="Cancel"
        />
      }
      confirmButtonText={
        <FormattedMessage
          id="xpack.cloudConnect.services.disable.confirmButton"
          defaultMessage="Disable service"
        />
      }
      buttonColor="danger"
      defaultFocusedButton="cancel"
      confirmButtonDisabled={isLoading}
      isLoading={isLoading}
      data-test-subj="disableServiceModal"
    >
      <p data-test-subj="disableServiceModalDescription">
        <FormattedMessage
          id="xpack.cloudConnect.services.disable.modalDescription"
          defaultMessage="Disabling this service will permanently remove all related setup and configuration from your cluster. You can re-enable it later, but your progress will be lost."
        />
      </p>
    </EuiConfirmModal>
  );
};
