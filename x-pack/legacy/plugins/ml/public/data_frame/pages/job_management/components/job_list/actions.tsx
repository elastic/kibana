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

import { DataFrameJobListRow, DATA_FRAME_RUNNING_STATE } from './common';
import { deleteJobFactory, startJobFactory, stopJobFactory } from './job_service';

import { StartAction } from './action_start';
import { DeleteAction } from './action_delete';

export const getActions = (getJobs: () => void) => {
  const canStartStopDataFrameJob: boolean = checkPermission('canStartStopDataFrameJob');

  const deleteJob = deleteJobFactory(getJobs);
  const startJob = startJobFactory(getJobs);
  const stopJob = stopJobFactory(getJobs);

  return [
    {
      isPrimary: true,
      render: (item: DataFrameJobListRow) => {
        if (item.state.task_state !== DATA_FRAME_RUNNING_STATE.STARTED) {
          return <StartAction startJob={startJob} item={item} />;
        }

        const buttonStopText = i18n.translate('xpack.ml.dataframe.jobsList.stopActionName', {
          defaultMessage: 'Stop',
        });

        const stopButton = (
          <EuiButtonEmpty
            size="xs"
            color="text"
            disabled={!canStartStopDataFrameJob}
            iconType="stop"
            onClick={() => stopJob(item)}
            aria-label={buttonStopText}
          >
            {buttonStopText}
          </EuiButtonEmpty>
        );
        if (!canStartStopDataFrameJob) {
          return (
            <EuiToolTip
              position="top"
              content={createPermissionFailureMessage('canStartStopDataFrameJob')}
            >
              {stopButton}
            </EuiToolTip>
          );
        }

        return stopButton;
      },
    },
    {
      render: (item: DataFrameJobListRow) => {
        return <DeleteAction deleteJob={deleteJob} item={item} />;
      },
    },
  ];
};
