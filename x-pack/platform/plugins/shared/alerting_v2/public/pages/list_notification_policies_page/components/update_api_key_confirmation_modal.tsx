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

interface UpdateApiKeyConfirmationModalProps {
  count: number;
  onCancel: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export const UpdateApiKeyConfirmationModal = ({
  count,
  onCancel,
  onConfirm,
  isLoading = false,
}: UpdateApiKeyConfirmationModalProps) => {
  const titleId = useGeneratedHtmlId();
  return (
    <EuiConfirmModal
      id="updateApiKeyNotificationPoliciesConfirmModal"
      aria-labelledby={titleId}
      titleProps={{ id: titleId }}
      title={i18n.translate('xpack.alertingV2.notificationPolicy.updateApiKeyModal.title', {
        defaultMessage:
          'Update API {count, plural, one {key} other {keys}} for {count} {count, plural, one {notification policy} other {notification policies}}?',
        values: { count },
      })}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={i18n.translate(
        'xpack.alertingV2.notificationPolicy.updateApiKeyModal.cancelButton',
        { defaultMessage: 'Cancel' }
      )}
      confirmButtonText={i18n.translate(
        'xpack.alertingV2.notificationPolicy.updateApiKeyModal.confirmButton',
        { defaultMessage: 'Confirm' }
      )}
      buttonColor="primary"
      isLoading={isLoading}
    >
      <FormattedMessage
        id="xpack.alertingV2.notificationPolicy.updateApiKeyModal.body"
        defaultMessage="The API {count, plural, one {key} other {keys}} for the selected {count, plural, one {notification policy} other {notification policies}} will be regenerated using your current credentials."
        values={{ count }}
      />
    </EuiConfirmModal>
  );
};
