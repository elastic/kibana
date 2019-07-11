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
  datafeedState: string;
  latestTimestampMs: number;
  onJobStateChange: Function;
}

// Max start time for job is no more than two weeks ago to ensure job performance
const maxStartTime = moment
  .utc()
  .subtract(14, 'days')
  .valueOf();

// Based on ML Datefeed States from x-pack/legacy/plugins/ml/common/constants/states.js
const getIsCheckedFromDatafeedState = (datafeedState: string): boolean => {
  switch (datafeedState) {
    case 'started':
      return true;
    case 'stopped':
      return false;
    default:
      return false;
  }
};

const getIsProcessingFromDatafeedState = (datafeedState: string): boolean => {
  switch (datafeedState) {
    case 'starting':
      return true;
    case 'stopping':
      return true;
    default:
      return false;
  }
};

export const JobSwitch = React.memo<JobSwitchProps>(
  ({ jobName, datafeedState, latestTimestampMs, onJobStateChange }) => {
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
          {isLoading || getIsProcessingFromDatafeedState(datafeedState) ? (
            <EuiLoadingSpinner size="m" />
          ) : (
            <EuiSwitch
              data-test-subj="job-detail-switch"
              disabled={isLoading}
              checked={getIsCheckedFromDatafeedState(datafeedState)}
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
