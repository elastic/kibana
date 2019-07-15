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

import { startTransform } from '../../services/transform_service';

import {
  checkPermission,
  createPermissionFailureMessage,
} from '../../../../../privilege/check_privilege';

import { DataFrameTransformListRow, isCompletedBatchTransform } from './common';

interface StartActionProps {
  item: DataFrameTransformListRow;
}

export const StartAction: SFC<StartActionProps> = ({ item }) => {
  const canStartStopDataFrameTransform: boolean = checkPermission('canStartStopDataFrame');

  const [isModalVisible, setModalVisible] = useState(false);

  const closeModal = () => setModalVisible(false);
  const startAndCloseModal = () => {
    setModalVisible(false);
    startTransform(item);
  };
  const openModal = () => setModalVisible(true);

  const buttonStartText = i18n.translate('xpack.ml.dataframe.transformList.startActionName', {
    defaultMessage: 'Start',
  });

  // Disable start for batch transforms which have completed.
  const completedBatchTransform = isCompletedBatchTransform(item);

  let startButton = (
    <EuiButtonEmpty
      size="xs"
      color="text"
      disabled={!canStartStopDataFrameTransform || completedBatchTransform}
      iconType="play"
      onClick={openModal}
      aria-label={buttonStartText}
    >
      {buttonStartText}
    </EuiButtonEmpty>
  );

  if (!canStartStopDataFrameTransform || completedBatchTransform) {
    startButton = (
      <EuiToolTip
        position="top"
        content={
          !canStartStopDataFrameTransform
            ? createPermissionFailureMessage('canStartStopDataFrame')
            : i18n.translate('xpack.ml.dataframe.transformList.completeBatchTransformToolTip', {
                defaultMessage:
                  '{transformId} is a completed batch transform and cannot be restarted.',
                values: { transformId: item.config.id },
              })
        }
      >
        {startButton}
      </EuiToolTip>
    );
  }

  return (
    <Fragment>
      {startButton}
      {isModalVisible && (
        <EuiOverlayMask>
          <EuiConfirmModal
            title={i18n.translate('xpack.ml.dataframe.transformList.startModalTitle', {
              defaultMessage: 'Start {transformId}',
              values: { transformId: item.config.id },
            })}
            onCancel={closeModal}
            onConfirm={startAndCloseModal}
            cancelButtonText={i18n.translate(
              'xpack.ml.dataframe.transformList.startModalCancelButton',
              {
                defaultMessage: 'Cancel',
              }
            )}
            confirmButtonText={i18n.translate(
              'xpack.ml.dataframe.transformList.startModalStartButton',
              {
                defaultMessage: 'Start',
              }
            )}
            defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
            buttonColor="primary"
          >
            <p>
              {i18n.translate('xpack.ml.dataframe.transformList.startModalBody', {
                defaultMessage:
                  'A data frame transform will increase search and indexing load in your cluster. Please stop the transform if excessive load is experienced. Are you sure you want to start this transform?',
              })}
            </p>
          </EuiConfirmModal>
        </EuiOverlayMask>
      )}
    </Fragment>
  );
};
