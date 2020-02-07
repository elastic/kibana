/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useRef, useState } from 'react';
import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';
import { useAppDependencies } from '../index';
import { executePolicy as executePolicyRequest } from '../services/http';

interface Props {
  children: (executePolicy: ExecutePolicy) => React.ReactElement;
}

export type ExecutePolicy = (name: string, onSuccess?: OnSuccessCallback) => void;

type OnSuccessCallback = () => void;

export const PolicyExecuteProvider: React.FunctionComponent<Props> = ({ children }) => {
  const {
    core: {
      i18n,
      notification: { toastNotifications },
    },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;
  const [policyName, setPolicyName] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const onSuccessCallback = useRef<OnSuccessCallback | null>(null);

  const executePolicyPrompt: ExecutePolicy = (name, onSuccess = () => undefined) => {
    if (!name || !name.length) {
      throw new Error('No policy name specified for execution');
    }
    setIsModalOpen(true);
    setPolicyName(name);
    onSuccessCallback.current = onSuccess;
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setPolicyName('');
  };
  const executePolicy = () => {
    executePolicyRequest(policyName).then(({ data, error }) => {
      const { snapshotName } = data || { snapshotName: undefined };

      // Surface success notification
      if (snapshotName) {
        const successMessage = i18n.translate(
          'xpack.snapshotRestore.executePolicy.successNotificationTitle',
          {
            defaultMessage: "Policy '{name}' is running",
            values: { name: policyName },
          }
        );
        toastNotifications.addSuccess(successMessage);
        if (onSuccessCallback.current) {
          onSuccessCallback.current();
        }
      }

      // Surface error notifications
      if (error) {
        const errorMessage = i18n.translate(
          'xpack.snapshotRestore.executePolicy.errorNotificationTitle',
          {
            defaultMessage: "Error running policy '{name}'",
            values: { name: policyName },
          }
        );
        toastNotifications.addDanger(errorMessage);
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
              id="xpack.snapshotRestore.executePolicy.confirmModal.executePolicyTitle"
              defaultMessage="Run '{name}' now?"
              values={{ name: policyName }}
            />
          }
          onCancel={closeModal}
          onConfirm={executePolicy}
          cancelButtonText={
            <FormattedMessage
              id="xpack.snapshotRestore.executePolicy.confirmModal.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          }
          confirmButtonText={
            <FormattedMessage
              id="xpack.snapshotRestore.executePolicy.confirmModal.confirmButtonLabel"
              defaultMessage="Run policy"
            />
          }
          data-test-subj="srExecutePolicyConfirmationModal"
        />
      </EuiOverlayMask>
    );
  };

  return (
    <Fragment>
      {children(executePolicyPrompt)}
      {renderModal()}
    </Fragment>
  );
};
