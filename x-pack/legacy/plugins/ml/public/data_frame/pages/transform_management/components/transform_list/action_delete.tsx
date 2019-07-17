/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, SFC, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiOverlayMask,
  EuiToolTip,
  EUI_MODAL_CONFIRM_BUTTON,
} from '@elastic/eui';

import { deleteTransform } from '../../services/transform_service';

import {
  checkPermission,
  createPermissionFailureMessage,
} from '../../../../../privilege/check_privilege';

import { DataFrameTransformListRow, DATA_FRAME_TASK_STATE } from './common';

interface DeleteActionProps {
  item: DataFrameTransformListRow;
}

export const DeleteAction: SFC<DeleteActionProps> = ({ item }) => {
  const disabled = item.state.task_state === DATA_FRAME_TASK_STATE.STARTED;

  const canDeleteDataFrame: boolean = checkPermission('canDeleteDataFrame');

  const [isModalVisible, setModalVisible] = useState(false);

  const closeModal = () => setModalVisible(false);
  const deleteAndCloseModal = () => {
    setModalVisible(false);
    deleteTransform(item);
  };
  const openModal = () => setModalVisible(true);

  const buttonDeleteText = i18n.translate('xpack.ml.dataframe.transformList.deleteActionName', {
    defaultMessage: 'Delete',
  });

  let deleteButton = (
    <EuiButtonEmpty
      size="xs"
      color="text"
      disabled={disabled || !canDeleteDataFrame}
      iconType="trash"
      onClick={openModal}
      aria-label={buttonDeleteText}
    >
      {buttonDeleteText}
    </EuiButtonEmpty>
  );

  if (disabled || !canDeleteDataFrame) {
    deleteButton = (
      <EuiToolTip
        position="top"
        content={
          disabled
            ? i18n.translate(
                'xpack.ml.dataframe.transformList.deleteActionDisabledToolTipContent',
                {
                  defaultMessage: 'Stop the data frame transform in order to delete it.',
                }
              )
            : createPermissionFailureMessage('canStartStopDataFrame')
        }
      >
        {deleteButton}
      </EuiToolTip>
    );
  }

  return (
    <Fragment>
      {deleteButton}
      {isModalVisible && (
        <EuiOverlayMask>
          <EuiConfirmModal
            title={i18n.translate('xpack.ml.dataframe.transformList.deleteModalTitle', {
              defaultMessage: 'Delete {transformId}',
              values: { transformId: item.config.id },
            })}
            onCancel={closeModal}
            onConfirm={deleteAndCloseModal}
            cancelButtonText={i18n.translate(
              'xpack.ml.dataframe.transformList.deleteModalCancelButton',
              {
                defaultMessage: 'Cancel',
              }
            )}
            confirmButtonText={i18n.translate(
              'xpack.ml.dataframe.transformList.deleteModalDeleteButton',
              {
                defaultMessage: 'Delete',
              }
            )}
            defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
            buttonColor="danger"
          >
            <p>
              {i18n.translate('xpack.ml.dataframe.transformList.deleteModalBody', {
                defaultMessage: `Are you sure you want to delete this transform? The transform's destination index and optional Kibana index pattern will not be deleted.`,
              })}
            </p>
          </EuiConfirmModal>
        </EuiOverlayMask>
      )}
    </Fragment>
  );
};
