/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState } from 'react';
import {
  EuiCallOut,
  EuiButton,
  EuiConfirmModal,
  EUI_MODAL_CONFIRM_BUTTON,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useDeleteTransforms } from '../../../../hooks';
import { TRANSFORM_STATE } from '../../../../../../common/constants';

export const DanglingTasksWarning: FC<{
  transformIdsWithoutConfig?: string[];
}> = ({ transformIdsWithoutConfig }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const deleteTransforms = useDeleteTransforms();

  const closeModal = () => setIsModalVisible(false);
  const openModal = () => setIsModalVisible(true);

  const confirmDelete = () => {
    if (transformIdsWithoutConfig) {
      deleteTransforms(
        // If transform task doesn't have any corresponding config
        // we won't know what the destination index or data view would be
        // and should be force deleted
        {
          transformsInfo: transformIdsWithoutConfig.map((id) => ({
            id,
            state: TRANSFORM_STATE.FAILED,
          })),
          deleteDestIndex: false,
          deleteDestDataView: false,
          forceDelete: true,
        }
      );
    }
    closeModal();
  };

  if (!transformIdsWithoutConfig || transformIdsWithoutConfig.length === 0) {
    return null;
  }

  const isBulkAction = transformIdsWithoutConfig.length > 1;

  const bulkDeleteModalTitle = i18n.translate(
    'xpack.transform.transformList.bulkDeleteModalTitle',
    {
      defaultMessage: 'Delete {count} {count, plural, one {transform} other {transforms}}?',
      values: { count: transformIdsWithoutConfig.length },
    }
  );
  const deleteModalTitle = i18n.translate('xpack.transform.transformList.deleteModalTitle', {
    defaultMessage: 'Delete {transformId}?',
    values: { transformId: transformIdsWithoutConfig[0] },
  });

  return (
    <>
      <EuiCallOut color="warning">
        <p>
          <FormattedMessage
            id="xpack.transform.danglingTasksError"
            defaultMessage="{count} {count, plural, one {transform is} other {transforms are}} missing configuration details: [{transformIds}] {count, plural, one {It} other {They}} cannot be recovered and should be deleted."
            values={{
              count: transformIdsWithoutConfig.length,
              transformIds: transformIdsWithoutConfig.join(', '),
            }}
          />
        </p>
        <EuiButton color="warning" size="s" onClick={openModal}>
          <FormattedMessage
            id="xpack.transform.forceDeleteTransformMessage"
            defaultMessage="Delete {count} {count, plural, one {transform} other {transforms}}"
            values={{
              count: transformIdsWithoutConfig.length,
            }}
          />
        </EuiButton>
      </EuiCallOut>
      <EuiSpacer />
      {isModalVisible && (
        <EuiConfirmModal
          title={isBulkAction ? bulkDeleteModalTitle : deleteModalTitle}
          onCancel={closeModal}
          onConfirm={confirmDelete}
          cancelButtonText={i18n.translate(
            'xpack.transform.transformList.deleteModalCancelButton',
            {
              defaultMessage: 'Cancel',
            }
          )}
          confirmButtonText={i18n.translate(
            'xpack.transform.transformList.deleteModalDeleteButton',
            {
              defaultMessage: 'Delete',
            }
          )}
          defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
          buttonColor="danger"
        />
      )}
    </>
  );
};
