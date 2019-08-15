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
import { stopTransforms } from '../../services/transform_service';

interface StopActionProps {
  items: DataFrameTransformListRow[];
}

export const StopAction: SFC<StopActionProps> = ({ items }) => {
  const canStartStopDataFrame: boolean = checkPermission('canStartStopDataFrame');
  const buttonStopText = i18n.translate('xpack.ml.dataframe.transformList.stopActionName', {
    defaultMessage: 'Stop',
  });

  const handleStop = () => {
    stopTransforms(items);
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
