/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSwitch } from '@elastic/eui';
import moment from 'moment';

import { KibanaConfigContext } from '../../lib/adapters/framework/kibana_framework_adapter';
import { startDatafeeds, stopDatafeeds } from './api';

export interface JobSwitchProps {
  jobName: string;
  jobDescription: string;
  jobState: string;
  datafeedState: string;
  latestTimestampMs: number;
  onJobStateChange: Function;
}

// Max start time for job is no more than two weeks ago to ensure job performance
const maxStartTime = moment
  .utc()
  .subtract(14, 'days')
  .valueOf();

// Based on ML Job/Datafeed States from x-pack/legacy/plugins/ml/common/constants/states.js
const enabledStates = ['started', 'opened'];
const loadingStates = ['starting', 'stopping', 'opening', 'closing'];
const failureStates = ['deleted', 'failed'];

const isChecked = (jobState: string, datafeedState: string): boolean => {
  return enabledStates.includes(jobState) && enabledStates.includes(datafeedState);
};

const isJobLoading = (jobState: string, datafeedState: string): boolean => {
  return loadingStates.includes(jobState) || loadingStates.includes(datafeedState);
};

const isFailure = (jobState: string, datafeedState: string): boolean => {
  return failureStates.includes(jobState) || failureStates.includes(datafeedState);
};

export const JobSwitch = React.memo<JobSwitchProps>(
  ({ jobName, jobState, datafeedState, latestTimestampMs, onJobStateChange }) => {
    const [isLoading, setIsLoading] = useState(false);
    const config = useContext(KibanaConfigContext);
    const headers = { 'kbn-version': config.kbnVersion };

    const startDatafeed = async (enable: boolean) => {
      if (enable) {
        const startTime = Math.max(latestTimestampMs, maxStartTime);
        await startDatafeeds([`datafeed-${jobName}`], headers, startTime);
      } else {
        await stopDatafeeds([`datafeed-${jobName}`], headers);
      }
      onJobStateChange();
      setIsLoading(false);
    };

    return (
      <EuiFlexGroup justifyContent="spaceAround">
        <EuiFlexItem grow={false}>
          {isLoading || isJobLoading(jobState, datafeedState) ? (
            <EuiLoadingSpinner size="m" />
          ) : (
            <EuiSwitch
              data-test-subj="job-detail-switch"
              disabled={isFailure(jobState, datafeedState)}
              checked={isChecked(jobState, datafeedState)}
              onChange={e => {
                setIsLoading(true);
                startDatafeed(e.target.checked);
              }}
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
