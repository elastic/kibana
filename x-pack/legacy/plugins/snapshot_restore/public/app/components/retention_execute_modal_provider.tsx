/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';
import { useAppDependencies } from '../index';
import { executeRetention as executeRetentionRequest } from '../services/http';

interface Props {
  children: (executeRetention: ExecuteRetention) => React.ReactElement;
}

export type ExecuteRetention = () => void;

export const RetentionExecuteModalProvider: React.FunctionComponent<Props> = ({ children }) => {
  const {
    core: {
      i18n,
      notification: { toastNotifications },
    },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const executeRetentionPrompt: ExecuteRetention = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const executeRetention = () => {
    executeRetentionRequest().then(({ error }) => {
      if (error) {
        const errorMessage = i18n.translate('xpack.snapshotRestore.executeRetention.errorMessage', {
          defaultMessage: 'Error running retention',
        });
        toastNotifications.addDanger(errorMessage);
      } else {
        const successMessage = i18n.translate(
          'xpack.snapshotRestore.executeRetention.successMessage',
          {
            defaultMessage: 'Retention is running',
          }
        );
        toastNotifications.addSuccess(successMessage);
      }
    });
    closeModal();
  };

  const renderModal = () => {
    if (!isModalOpen) {
      return null;
    }

    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={
            <FormattedMessage
              id="xpack.snapshotRestore.executeRetention.confirmModal.executeRetentionTitle"
              defaultMessage="Run snapshot retention now?"
            />
          }
          onCancel={closeModal}
          onConfirm={executeRetention}
          cancelButtonText={
            <FormattedMessage
              id="xpack.snapshotRestore.executeRetention.confirmModal.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          }
          confirmButtonText={
            <FormattedMessage
              id="xpack.snapshotRestore.executeRetention.confirmModal.confirmButtonLabel"
              defaultMessage="Run retention"
            />
          }
          data-test-subj="executeRetentionModal"
        />
      </EuiOverlayMask>
    );
  };

  return (
    <>
      {children(executeRetentionPrompt)}
      {renderModal()}
    </>
  );
};
