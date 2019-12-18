/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import styled from 'styled-components';
import React, { useState, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSwitch } from '@elastic/eui';
import { SiemJob } from '../types';

const StaticSwitch = styled(EuiSwitch)`
  .euiSwitch__thumb,
  .euiSwitch__icon {
    transition: none;
  }
`;

StaticSwitch.displayName = 'StaticSwitch';

export interface JobSwitchProps {
  job: SiemJob;
  isSiemJobsLoading: boolean;
  onJobStateChange: (job: SiemJob, latestTimestampMs: number, enable: boolean) => void;
}

// Based on ML Job/Datafeed States from x-pack/legacy/plugins/ml/common/constants/states.js
const enabledStates = ['started', 'opened'];
const loadingStates = ['starting', 'stopping', 'opening', 'closing'];
const failureStates = ['deleted', 'failed'];

export const isChecked = (jobState: string, datafeedState: string): boolean => {
  return enabledStates.includes(jobState) && enabledStates.includes(datafeedState);
};

export const isJobLoading = (jobState: string, datafeedState: string): boolean => {
  return loadingStates.includes(jobState) || loadingStates.includes(datafeedState);
};

export const isFailure = (jobState: string, datafeedState: string): boolean => {
  return failureStates.includes(jobState) || failureStates.includes(datafeedState);
};

export const JobSwitchComponent = ({
  job,
  isSiemJobsLoading,
  onJobStateChange,
}: JobSwitchProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const handleChange = useCallback(
    e => {
      setIsLoading(true);
      onJobStateChange(job, job.latestTimestampMs || 0, e.target.checked);
    },
    [job, setIsLoading, onJobStateChange]
  );

  return (
    <EuiFlexGroup justifyContent="spaceAround">
      <EuiFlexItem grow={false}>
        {isSiemJobsLoading || isLoading || isJobLoading(job.jobState, job.datafeedId) ? (
          <EuiLoadingSpinner size="m" data-test-subj="job-switch-loader" />
        ) : (
          <StaticSwitch
            data-test-subj="job-switch"
            disabled={isFailure(job.jobState, job.datafeedState)}
            checked={isChecked(job.jobState, job.datafeedState)}
            onChange={handleChange}
            showLabel={false}
            label=""
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

JobSwitchComponent.displayName = 'JobSwitchComponent';

export const JobSwitch = React.memo(JobSwitchComponent);

JobSwitch.displayName = 'JobSwitch';
