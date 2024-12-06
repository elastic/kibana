/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiConfirmModal, EuiCallOut } from '@elastic/eui';

import type { EnrollmentAPIKey } from '../../../../types';

interface Props {
  onCancel: () => void;
  onConfirm: () => void;
  enrollmentKey: EnrollmentAPIKey;
}

export const ConfirmEnrollmentTokenDelete = (props: Props) => {
  const { onCancel, onConfirm, enrollmentKey } = props;
  return (
    <EuiConfirmModal
      title={i18n.translate('xpack.fleet.enrollmentTokenDeleteModal.title', {
        defaultMessage: 'Revoke enrollment token',
      })}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={i18n.translate('xpack.fleet.enrollmentTokenDeleteModal.cancelButton', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.fleet.enrollmentTokenDeleteModal.deleteButton', {
        defaultMessage: 'Revoke enrollment token',
      })}
      defaultFocusedButton="confirm"
      buttonColor="danger"
    >
      <EuiCallOut
        title={i18n.translate('xpack.fleet.enrollmentTokenDeleteModal.description', {
          defaultMessage:
            'Are you sure you want to revoke {keyName}? New agents will no longer be able to be enrolled using this token.',
          values: {
            keyName: enrollmentKey.name,
          },
        })}
        color="danger"
      />
    </EuiConfirmModal>
  );
};
