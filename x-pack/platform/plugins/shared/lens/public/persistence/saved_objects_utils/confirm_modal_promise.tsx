/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiConfirmModal } from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { StartServices } from '../../types';

export function confirmModalPromise(
  message = '',
  title = '',
  confirmBtnText = '',
  startServices: StartServices
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const cancelButtonText = i18n.translate('xpack.lens.confirmModal.cancelButtonLabel', {
      defaultMessage: 'Cancel',
    });

    const modal = startServices.overlays.openModal(
      toMountPoint(
        <EuiConfirmModal
          onCancel={() => {
            modal.close();
            reject();
          }}
          onConfirm={() => {
            modal.close();
            resolve(true);
          }}
          confirmButtonText={confirmBtnText}
          cancelButtonText={cancelButtonText}
          title={title}
        >
          {message}
        </EuiConfirmModal>,
        startServices
      )
    );
  });
}
