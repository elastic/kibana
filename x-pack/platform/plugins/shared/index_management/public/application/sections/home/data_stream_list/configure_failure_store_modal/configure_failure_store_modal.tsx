/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { FailureStoreFormData } from '@kbn/failure-store-modal';
import { FailureStoreModal } from '@kbn/failure-store-modal';

import type { DataStream } from '../../../../../../common';
import { useAppContext } from '../../../../app_context';
import { updateDSFailureStore } from '../../../../services/api';

interface Props {
  dataStreams: DataStream[];
  ilmPolicyName?: string;
  ilmPolicyLink?: string;
  onClose: (data?: { hasUpdatedFailureStore: boolean }) => void;
}

export const ConfigureFailureStoreModal: React.FunctionComponent<Props> = ({
  dataStreams,
  onClose,
}) => {
  // We will support multiple data streams in the future, but for now we only support one.
  const dataStream = dataStreams[0];

  const {
    services: { notificationService },
    config: { enableFailureStoreRetentionDisabling },
  } = useAppContext();

  const handleSaveModal = async (data: FailureStoreFormData) => {
    return updateDSFailureStore([dataStream.name], {
      dsFailureStore: data.failureStoreEnabled,
      customRetentionPeriod:
        'customRetentionPeriod' in data && data.customRetentionPeriod
          ? data.customRetentionPeriod
          : undefined,
      retentionDisabled: 'retentionDisabled' in data && data.retentionDisabled,
    }).then(({ data: responseData, error }) => {
      if (responseData) {
        if (responseData.warning) {
          notificationService.showWarningToast(responseData.warning);
          return onClose({ hasUpdatedFailureStore: true });
        }

        const successMessage = i18n.translate(
          'xpack.idxMgmt.dataStreams.configureFailureStoreModal.successFailureStoreNotification',
          {
            defaultMessage:
              'Failure store {disabledFailureStore, plural, one { disabled } other { enabled } }',
            values: { disabledFailureStore: !data.failureStoreEnabled ? 1 : 0 },
          }
        );

        notificationService.showSuccessToast(successMessage);

        return onClose({ hasUpdatedFailureStore: true });
      }

      if (error) {
        const errorMessage = i18n.translate(
          'xpack.idxMgmt.dataStreams.configureFailureStoreModal.errorFailureStoreNotification',
          {
            defaultMessage: "Error configuring failure store: ''{error}''",
            values: { error: error.message },
          }
        );
        notificationService.showDangerToast(errorMessage);
      }

      onClose();
    });
  };

  return (
    <FailureStoreModal
      onCloseModal={onClose}
      onSaveModal={handleSaveModal}
      failureStoreProps={{
        failureStoreEnabled: dataStream?.failureStoreEnabled ?? false,
        customRetentionPeriod: dataStream?.failureStoreRetention?.customRetentionPeriod,
        defaultRetentionPeriod: dataStream?.failureStoreRetention?.defaultRetentionPeriod,
        retentionDisabled: dataStream?.failureStoreRetention?.retentionDisabled ?? false,
      }}
      canShowDisableLifecycle={enableFailureStoreRetentionDisabling}
    />
  );
};
