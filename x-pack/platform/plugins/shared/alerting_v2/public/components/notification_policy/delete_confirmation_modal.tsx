/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

interface DeleteNotificationPolicyConfirmModalProps {
  policyName: string;
  onCancel: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export const DeleteNotificationPolicyConfirmModal = ({
  policyName,
  onCancel,
  onConfirm,
  isLoading = false,
}: DeleteNotificationPolicyConfirmModalProps) => {
  const titleId = useGeneratedHtmlId();
  return (
    <EuiConfirmModal
      id="deleteNotificationPolicyConfirmModal"
      aria-labelledby={titleId}
      titleProps={{ id: titleId }}
      title={i18n.translate('xpack.alertingV2.notificationPolicy.deleteModal.title', {
        defaultMessage: 'Delete notification policy',
      })}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={i18n.translate(
        'xpack.alertingV2.notificationPolicy.deleteModal.cancelButton',
        { defaultMessage: 'Cancel' }
      )}
      confirmButtonText={i18n.translate(
        'xpack.alertingV2.notificationPolicy.deleteModal.confirmButton',
        { defaultMessage: 'Delete' }
      )}
      buttonColor="danger"
      isLoading={isLoading}
    >
      <FormattedMessage
        id="xpack.alertingV2.notificationPolicy.deleteModal.body"
        defaultMessage="Are you sure you want to delete {policyName}? This action cannot be undone."
        values={{ policyName: <strong>{policyName}</strong> }}
      />
    </EuiConfirmModal>
  );
};
