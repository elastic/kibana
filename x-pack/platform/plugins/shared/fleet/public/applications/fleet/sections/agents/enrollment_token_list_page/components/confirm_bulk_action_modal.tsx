/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiConfirmModal, EuiCallOut, useGeneratedHtmlId } from '@elastic/eui';

interface BulkActionModalProps {
  count: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmRevokeModal = ({ count, onCancel, onConfirm }: BulkActionModalProps) => {
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      title={
        count === 1
          ? i18n.translate('xpack.fleet.enrollmentTokenBulkRevokeModal.titleSingle', {
              defaultMessage: 'Revoke enrollment token',
            })
          : i18n.translate('xpack.fleet.enrollmentTokenBulkRevokeModal.title', {
              defaultMessage: 'Revoke {count} enrollment tokens',
              values: { count },
            })
      }
      titleProps={{ id: modalTitleId }}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={i18n.translate('xpack.fleet.enrollmentTokenBulkRevokeModal.cancelButton', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate(
        'xpack.fleet.enrollmentTokenBulkRevokeModal.confirmButton',
        {
          defaultMessage: 'Revoke {count, plural, one {token} other {tokens}}',
          values: { count },
        }
      )}
      defaultFocusedButton="confirm"
      buttonColor="danger"
    >
      <EuiCallOut
        title={i18n.translate('xpack.fleet.enrollmentTokenBulkRevokeModal.description', {
          defaultMessage:
            'Are you sure you want to revoke {count, plural, one {this token} other {these tokens}}? You will no longer be able to use {count, plural, one {it} other {them}} to enroll new agents.',
          values: { count },
        })}
        color="danger"
      />
    </EuiConfirmModal>
  );
};

export const ConfirmDeleteModal = ({ count, onCancel, onConfirm }: BulkActionModalProps) => {
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      title={
        count === 1
          ? i18n.translate('xpack.fleet.enrollmentTokenBulkDeleteModal.titleSingle', {
              defaultMessage: 'Delete enrollment token',
            })
          : i18n.translate('xpack.fleet.enrollmentTokenBulkDeleteModal.title', {
              defaultMessage: 'Delete {count} enrollment tokens',
              values: { count },
            })
      }
      titleProps={{ id: modalTitleId }}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={i18n.translate('xpack.fleet.enrollmentTokenBulkDeleteModal.cancelButton', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate(
        'xpack.fleet.enrollmentTokenBulkDeleteModal.confirmButton',
        {
          defaultMessage: 'Delete {count, plural, one {token} other {tokens}}',
          values: { count },
        }
      )}
      defaultFocusedButton="confirm"
      buttonColor="danger"
    >
      <EuiCallOut
        title={i18n.translate('xpack.fleet.enrollmentTokenBulkDeleteModal.description', {
          defaultMessage:
            'Are you sure you want to delete {count, plural, one {this token} other {these tokens}}? Any active {count, plural, one {token} other {tokens}} will be revoked, and you will no longer be able to use {count, plural, one {it} other {them}} to enroll new agents.',
          values: { count },
        })}
        color="danger"
      />
    </EuiConfirmModal>
  );
};
