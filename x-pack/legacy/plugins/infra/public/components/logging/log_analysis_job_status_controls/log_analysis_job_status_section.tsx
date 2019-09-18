/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';

import { EuiHealth, EuiBasicTable } from '@elastic/eui';
import { JobStatus, JobType } from '../../../../common/log_analysis';

export const LogAnalysisJobStatusSection: React.FunctionComponent<{
  jobStatus: Record<JobType, JobStatus>;
}> = ({ jobStatus }) => {
  const rows = useMemo(
    () =>
      Object.entries(jobStatus).map(([type, status]) => ({
        status,
        type,
      })),
    [jobStatus]
  );

  return <EuiBasicTable columns={jobStatusColumns} compressed items={rows} />;
};

const JobHealth: React.FunctionComponent<{ jobStatus: JobStatus }> = ({ jobStatus }) => {
  switch (jobStatus) {
    case 'started':
      return <EuiHealth color="success">Running</EuiHealth>;
    default:
      return <EuiHealth color="subdued">Unknown</EuiHealth>;
  }
};

const jobStatusColumns = [
  {
    field: 'type',
    name: 'Job Type',
    dataType: 'string',
  },
  {
    field: 'status',
    name: 'Status',
    dataType: 'string',
    render: (value: JobStatus) => <JobHealth jobStatus={value} />,
  },
];
