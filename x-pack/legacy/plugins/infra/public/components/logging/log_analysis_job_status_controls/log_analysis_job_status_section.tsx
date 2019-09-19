/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiHealth } from '@elastic/eui';
import { JobStatus, JobType } from '../../../../common/log_analysis';

export const LogAnalysisJobStatusSection: React.FunctionComponent<{
  jobStatus: JobStatus;
  jobType: JobType;
}> = ({ jobStatus, jobType }) => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem>{jobType}</EuiFlexItem>
      <EuiFlexItem>
        <JobHealth jobStatus={jobStatus} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const JobHealth: React.FunctionComponent<{ jobStatus: JobStatus }> = ({ jobStatus }) => {
  switch (jobStatus) {
    case 'started':
      return (
        <EuiHealth color="success">
          <FormattedMessage
            id="xpack.infra.logs.analysis.jobStatusPopover.jobStatusStartedLabel"
            defaultMessage="Running"
          />
        </EuiHealth>
      );
    default:
      return (
        <EuiHealth color="subdued">
          <FormattedMessage
            id="xpack.infra.logs.analysis.jobStatusPopover.jobStatusUnknownLabel"
            defaultMessage="Unknown"
          />
        </EuiHealth>
      );
  }
};
