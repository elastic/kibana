/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton } from '@elastic/eui';
import React from 'react';

import { JobStatus, JobType } from '../../../../common/log_analysis';
import { useVisibilityState } from '../../../utils/use_visibility_state';
import { LogAnalysisJobStatusPopover } from './log_analysis_job_status_popover';

export const LogAnalysisJobStatusIndicator: React.FunctionComponent<{
  jobStatus: Record<JobType, JobStatus>;
}> = ({ jobStatus }) => {
  const { hide: closePopover, isVisible: isPopoverOpen, show: openPopover } = useVisibilityState(
    false
  );

  return (
    <LogAnalysisJobStatusPopover
      anchorElement={
        <EuiButton color="secondary" iconType="iInCircle" onClick={openPopover}>
          ML jobs
        </EuiButton>
      }
      closePopover={closePopover}
      isOpen={isPopoverOpen}
      jobStatus={jobStatus}
    />
  );
};
