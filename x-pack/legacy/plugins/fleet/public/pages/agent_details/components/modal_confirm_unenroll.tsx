/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { SFC } from 'react';
import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

export const ModalConfirmUnenroll: SFC<Props> = ({ onConfirm, onCancel }) => {
  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        title={i18n.translate('xpack.fleet.enrollmentModal.title', {
          defaultMessage: 'Are you sure you want to unenroll this agent?',
        })}
        onCancel={onCancel}
        onConfirm={onConfirm}
        confirmButtonText={i18n.translate('xpack.fleet.enrollmentModal.confirmButton', {
          defaultMessage: 'Yes, do it',
        })}
        cancelButtonText={i18n.translate('xpack.fleet.enrollmentModal.cancelButton', {
          defaultMessage: "No, don't do it",
        })}
        defaultFocusedButton="confirm"
      ></EuiConfirmModal>
    </EuiOverlayMask>
  );
};
