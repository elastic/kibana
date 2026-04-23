/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiConfirmModal, EuiCallOut, useGeneratedHtmlId } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  action: 'delete' | 'revoke';
  count: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmBulkActionModal = ({ action, count, onCancel, onConfirm }: Props) => {
  const modalTitleId = useGeneratedHtmlId();
  const isDelete = action === 'delete';

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      title={
        isDelete
          ? i18n.translate('xpack.fleet.enrollmentTokenBulkDeleteModal.title', {
              defaultMessage:
                'Delete {count, plural, one {# enrollment token} other {# enrollment tokens}}',
              values: { count },
            })
          : i18n.translate('xpack.fleet.enrollmentTokenBulkRevokeModal.title', {
              defaultMessage:
                'Revoke {count, plural, one {# enrollment token} other {# enrollment tokens}}',
              values: { count },
            })
      }
      titleProps={{ id: modalTitleId }}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={i18n.translate('xpack.fleet.enrollmentTokenBulkActionModal.cancelButton', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={
        isDelete
          ? i18n.translate('xpack.fleet.enrollmentTokenBulkDeleteModal.confirmButton', {
              defaultMessage: 'Delete tokens',
            })
          : i18n.translate('xpack.fleet.enrollmentTokenBulkRevokeModal.confirmButton', {
              defaultMessage: 'Revoke tokens',
            })
      }
      defaultFocusedButton="confirm"
      buttonColor="danger"
    >
      <EuiCallOut color="danger">
        {isDelete ? (
          <FormattedMessage
            id="xpack.fleet.enrollmentTokenBulkDeleteModal.description"
            defaultMessage="This action is irreversible. Agents currently enrolling with these tokens will fail to enroll."
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.enrollmentTokenBulkRevokeModal.description"
            defaultMessage="Agents currently enrolling with these tokens will fail to enroll."
          />
        )}
      </EuiCallOut>
    </EuiConfirmModal>
  );
};
