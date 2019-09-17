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
} from '../../../../../../../ml/public/privilege/check_privilege';

import {
  DataFrameTransformListRow,
  isCompletedBatchTransform,
  DATA_FRAME_TRANSFORM_STATE,
} from '../../../../common';

interface StartActionProps {
  items: DataFrameTransformListRow[];
  forceDisable?: boolean;
}

export const StartAction: FC<StartActionProps> = ({ items, forceDisable }) => {
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
  // Disable start action if one of the transforms is already started or trying to restart will throw error
  const startedTransform = items.some(
    (i: DataFrameTransformListRow) => i.stats.state === DATA_FRAME_TRANSFORM_STATE.STARTED
  );

  let startedTransformMessage;
  let completedBatchTransformMessage;

  if (isBulkAction === true) {
    startedTransformMessage = i18n.translate(
      'xpack.ml.dataframe.transformList.startedTransformBulkToolTip',
      {
        defaultMessage: 'One or more selected data frame transforms is already started.',
      }
    );
    completedBatchTransformMessage = i18n.translate(
      'xpack.ml.dataframe.transformList.completeBatchTransformBulkActionToolTip',
      {
        defaultMessage:
          'One or more selected data frame transforms is a completed batch transform and cannot be restarted.',
      }
    );
  } else {
    startedTransformMessage = i18n.translate(
      'xpack.ml.dataframe.transformList.startedTransformToolTip',
      {
        defaultMessage: '{transformId} is already started.',
        values: { transformId: items[0] && items[0].config.id },
      }
    );
    completedBatchTransformMessage = i18n.translate(
      'xpack.ml.dataframe.transformList.completeBatchTransformToolTip',
      {
        defaultMessage: '{transformId} is a completed batch transform and cannot be restarted.',
        values: { transformId: items[0] && items[0].config.id },
      }
    );
  }

  const actionIsDisabled =
    !canStartStopDataFrameTransform || completedBatchTransform || startedTransform;

  let startButton = (
    <EuiButtonEmpty
      size="xs"
      color="text"
      disabled={forceDisable === true || actionIsDisabled}
      iconType="play"
      onClick={openModal}
      aria-label={buttonStartText}
    >
      {buttonStartText}
    </EuiButtonEmpty>
  );

  if (actionIsDisabled) {
    let content;
    if (!canStartStopDataFrameTransform) {
      content = createPermissionFailureMessage('canStartStopDataFrame');
    } else if (completedBatchTransform) {
      content = completedBatchTransformMessage;
    } else if (startedTransform) {
      content = startedTransformMessage;
    }

    startButton = (
      <EuiToolTip position="top" content={content}>
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
