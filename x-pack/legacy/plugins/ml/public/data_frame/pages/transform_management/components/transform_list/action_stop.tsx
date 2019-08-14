/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { SFC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';

import { DataFrameTransformListRow } from './common';
import {
  checkPermission,
  createPermissionFailureMessage,
} from '../../../../../privilege/check_privilege';
import { stopTransform, bulkStopTransforms } from '../../services/transform_service';

interface StopActionProps {
  item?: DataFrameTransformListRow;
  items?: DataFrameTransformListRow[];
}

export const StopAction: SFC<StopActionProps> = ({ item, items }) => {
  const isBulkAction = item === undefined && items !== undefined;
  const canStartStopDataFrame: boolean = checkPermission('canStartStopDataFrame');
  const buttonStopText = i18n.translate('xpack.ml.dataframe.transformList.stopActionName', {
    defaultMessage: 'Stop',
  });

  const handleStop = () => {
    if (isBulkAction === false && item) {
      stopTransform(item);
    } else if (isBulkAction === true && items) {
      bulkStopTransforms(items);
    }
  };

  const stopButton = (
    <EuiButtonEmpty
      size="xs"
      color="text"
      disabled={!canStartStopDataFrame}
      iconType="stop"
      onClick={handleStop}
      aria-label={buttonStopText}
    >
      {buttonStopText}
    </EuiButtonEmpty>
  );
  if (!canStartStopDataFrame) {
    return (
      <EuiToolTip position="top" content={createPermissionFailureMessage('canStartStopDataFrame')}>
        {stopButton}
      </EuiToolTip>
    );
  }

  return stopButton;
};
