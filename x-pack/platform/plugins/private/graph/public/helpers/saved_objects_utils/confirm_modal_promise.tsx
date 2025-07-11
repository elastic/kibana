/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';

export function confirmModalPromise(
  message = '',
  title = '',
  confirmBtnText = '',
  startServices: Pick<CoreStart, 'overlays' | 'analytics' | 'i18n' | 'theme' | 'userProfile'>
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const cancelButtonText = i18n.translate('xpack.graph.confirmModal.cancelButtonLabel', {
      defaultMessage: 'Cancel',
    });

    const confirmModalTitleId = useGeneratedHtmlId();

    const modal = startServices.overlays.openModal(
      toMountPoint(
        <EuiConfirmModal
          aria-labelledby={confirmModalTitleId}
          titleProps={{ id: confirmModalTitleId }}
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
