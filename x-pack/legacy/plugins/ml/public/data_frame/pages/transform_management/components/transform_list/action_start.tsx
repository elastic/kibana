/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiOverlayMask,
  EuiToolTip,
  EUI_MODAL_CONFIRM_BUTTON,
} from '@elastic/eui';

import { startTransforms } from '../../services/transform_service';

import {
  checkPermission,
  createPermissionFailureMessage,
} from '../../../../../privilege/check_privilege';

import { DataFrameTransformListRow, isCompletedBatchTransform } from './common';

interface StartActionProps {
  items: DataFrameTransformListRow[];
}

export const StartAction: FC<StartActionProps> = ({ items }) => {
  const isBulkAction = items.length > 1;
  const canStartStopDataFrameTransform: boolean = checkPermission('canStartStopDataFrame');

  const [isModalVisible, setModalVisible] = useState(false);

  const closeModal = () => setModalVisible(false);
  const startAndCloseModal = () => {
    setModalVisible(false);
    startTransforms(items);
  };
  const openModal = () => setModalVisible(true);

  const buttonStartText = i18n.translate('xpack.ml.dataframe.transformList.startActionName', {
    defaultMessage: 'Start',
  });

  // Disable start for batch transforms which have completed.
  const completedBatchTransform = items.some((i: DataFrameTransformListRow) =>
    isCompletedBatchTransform(i)
  );

  let completedBatchTransformMessage;
  if (isBulkAction === true) {
    completedBatchTransformMessage = i18n.translate(
      'xpack.ml.dataframe.transformList.completeBatchTransformBulkActionToolTip',
      {
        defaultMessage:
          'One or more selected data frame transforms is a completed batch transform and cannot be restarted.',
      }
    );
  } else {
    completedBatchTransformMessage = i18n.translate(
      'xpack.ml.dataframe.transformList.completeBatchTransformToolTip',
      {
        defaultMessage: '{transformId} is a completed batch transform and cannot be restarted.',
        values: { transformId: items[0] && items[0].config.id },
      }
    );
  }

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
            : completedBatchTransformMessage
        }
      >
        {startButton}
      </EuiToolTip>
    );
  }

  const bulkStartModalTitle = i18n.translate(
    'xpack.ml.dataframe.transformList.bulkStartModalTitle',
    {
      defaultMessage: 'Start {count} {count, plural, one {transform} other {transforms}}?',
      values: { count: items && items.length },
    }
  );
  const startModalTitle = i18n.translate('xpack.ml.dataframe.transformList.startModalTitle', {
    defaultMessage: 'Start {transformId}',
    values: { transformId: items[0] && items[0].config.id },
  });

  return (
    <Fragment>
      {startButton}
      {isModalVisible && (
        <EuiOverlayMask>
          <EuiConfirmModal
            title={isBulkAction === true ? bulkStartModalTitle : startModalTitle}
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
                  'A data frame transform will increase search and indexing load in your cluster. Please stop the transform if excessive load is experienced. Are you sure you want to start {count, plural, one {this} other {these}} {count} {count, plural, one {transform} other {transforms}}?',
                values: { count: items.length },
              })}
            </p>
          </EuiConfirmModal>
        </EuiOverlayMask>
      )}
    </Fragment>
  );
};
