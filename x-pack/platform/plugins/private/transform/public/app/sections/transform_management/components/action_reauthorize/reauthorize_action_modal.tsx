/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';
import { useGeneratedHtmlId } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { EUI_MODAL_CONFIRM_BUTTON, EuiConfirmModal } from '@elastic/eui';
import type { ReauthorizeAction } from './use_reauthorize_action';

export const ReauthorizeActionModal: FC<ReauthorizeAction> = ({
  closeModal,
  items,
  reauthorizeAndCloseModal,
}) => {
  const isBulkAction = items.length > 1;
  const modalTitleId = useGeneratedHtmlId();

  const bulkReauthorizeModalTitle = i18n.translate(
    'xpack.transform.transformList.bulkReauthorizeModalTitle',
    {
      defaultMessage: 'Reauthorize {count} {count, plural, one {transform} other {transforms}}?',
      values: { count: items && items.length },
    }
  );
  const reauthorizeModalTitle = i18n.translate(
    'xpack.transform.transformList.reauthorizeModalTitle',
    {
      defaultMessage: 'Reauthorize {transformId}?',
      values: { transformId: items[0] && items[0].config.id },
    }
  );

  return (
    <EuiConfirmModal
      data-test-subj="transformReauthorizeModal"
      aria-labelledby={modalTitleId}
      title={isBulkAction === true ? bulkReauthorizeModalTitle : reauthorizeModalTitle}
      titleProps={{ id: modalTitleId }}
      onCancel={closeModal}
      onConfirm={reauthorizeAndCloseModal}
      cancelButtonText={i18n.translate(
        'xpack.transform.transformList.reauthorizeModalCancelButton',
        {
          defaultMessage: 'Cancel',
        }
      )}
      confirmButtonText={i18n.translate(
        'xpack.transform.transformList.reauthorizeModalConfirmButton',
        {
          defaultMessage: 'Reauthorize',
        }
      )}
      defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
      buttonColor="primary"
    >
      <p>
        {i18n.translate('xpack.transform.transformList.reauthorizeModalBody', {
          defaultMessage:
            'Your current roles are used to update and start the transform. Starting a transform increases search and indexing load in your cluster. If excessive load is experienced, stop the transform.',
        })}
      </p>
    </EuiConfirmModal>
  );
};