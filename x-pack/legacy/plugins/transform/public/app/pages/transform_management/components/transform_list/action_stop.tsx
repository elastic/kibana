/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';

import { DataFrameTransformListRow, DATA_FRAME_TRANSFORM_STATE } from '../../../../common';
import {
  checkPermission,
  createPermissionFailureMessage,
} from '../../../../../../../ml/public/privilege/check_privilege';
import { stopTransforms } from '../../services/transform_service';

interface StopActionProps {
  items: DataFrameTransformListRow[];
  forceDisable?: boolean;
}

export const StopAction: FC<StopActionProps> = ({ items, forceDisable }) => {
  const isBulkAction = items.length > 1;
  const canStartStopDataFrame: boolean = checkPermission('canStartStopDataFrame');
  const buttonStopText = i18n.translate('xpack.ml.dataframe.transformList.stopActionName', {
    defaultMessage: 'Stop',
  });

  // Disable stop action if one of the transforms is stopped already
  const stoppedTransform = items.some(
    (i: DataFrameTransformListRow) => i.stats.state === DATA_FRAME_TRANSFORM_STATE.STOPPED
  );

  let stoppedTransformMessage;
  if (isBulkAction === true) {
    stoppedTransformMessage = i18n.translate(
      'xpack.ml.dataframe.transformList.stoppedTransformBulkToolTip',
      {
        defaultMessage: 'One or more selected transforms is already stopped.',
      }
    );
  } else {
    stoppedTransformMessage = i18n.translate(
      'xpack.ml.dataframe.transformList.stoppedTransformToolTip',
      {
        defaultMessage: '{transformId} is already stopped.',
        values: { transformId: items[0] && items[0].config.id },
      }
    );
  }

  const handleStop = () => {
    stopTransforms(items);
  };

  const stopButton = (
    <EuiButtonEmpty
      size="xs"
      color="text"
      disabled={forceDisable === true || !canStartStopDataFrame || stoppedTransform === true}
      iconType="stop"
      onClick={handleStop}
      aria-label={buttonStopText}
    >
      {buttonStopText}
    </EuiButtonEmpty>
  );
  if (!canStartStopDataFrame || stoppedTransform) {
    return (
      <EuiToolTip
        position="top"
        content={
          !canStartStopDataFrame
            ? createPermissionFailureMessage('canStartStopDataFrame')
            : stoppedTransformMessage
        }
      >
        {stopButton}
      </EuiToolTip>
    );
  }

  return stopButton;
};
