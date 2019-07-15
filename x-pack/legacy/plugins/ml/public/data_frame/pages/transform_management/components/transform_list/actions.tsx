/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';

import {
  checkPermission,
  createPermissionFailureMessage,
} from '../../../../../privilege/check_privilege';

import { DataFrameTransformListRow, DATA_FRAME_TASK_STATE } from './common';
import { stopTransform } from '../../services/transform_service';

import { StartAction } from './action_start';
import { DeleteAction } from './action_delete';

export const getActions = () => {
  const canStartStopDataFrame: boolean = checkPermission('canStartStopDataFrame');

  return [
    {
      isPrimary: true,
      render: (item: DataFrameTransformListRow) => {
        if (item.state.task_state !== DATA_FRAME_TASK_STATE.STARTED) {
          return <StartAction item={item} />;
        }

        const buttonStopText = i18n.translate('xpack.ml.dataframe.transformList.stopActionName', {
          defaultMessage: 'Stop',
        });

        const stopButton = (
          <EuiButtonEmpty
            size="xs"
            color="text"
            disabled={!canStartStopDataFrame}
            iconType="stop"
            onClick={() => stopTransform(item)}
            aria-label={buttonStopText}
          >
            {buttonStopText}
          </EuiButtonEmpty>
        );
        if (!canStartStopDataFrame) {
          return (
            <EuiToolTip
              position="top"
              content={createPermissionFailureMessage('canStartStopDataFrame')}
            >
              {stopButton}
            </EuiToolTip>
          );
        }

        return stopButton;
      },
    },
    {
      render: (item: DataFrameTransformListRow) => {
        return <DeleteAction item={item} />;
      },
    },
  ];
};
