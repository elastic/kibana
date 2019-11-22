/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiOverlayMask, EuiConfirmModal } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export const ConfirmDeleteModal: React.SFC<{
  onConfirm: () => void;
  onCancel: () => void;
  apiKeyId: string;
}> = ({ onConfirm, onCancel, apiKeyId }) => {
  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        title={
          <FormattedMessage
            id="xpack.fleet.deleteApiKeys.confirmModal.title"
            defaultMessage="Delete api key: {apiKeyId}"
            values={{
              apiKeyId,
            }}
          />
        }
        onCancel={onCancel}
        onConfirm={onConfirm}
        cancelButtonText={
          <FormattedMessage
            id="xpack.fleet.deleteApiKeys.confirmModal.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        }
        confirmButtonText={
          <FormattedMessage
            id="xpack.fleet.deleteApiKeys.confirmModal.confirmButtonLabel"
            defaultMessage="Delete"
          />
        }
        buttonColor="danger"
      />
    </EuiOverlayMask>
  );
};
