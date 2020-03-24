/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiToolTip } from '@elastic/eui';

import { useKibana } from '../../../../../lib/kibana';
import { SiemJob } from '../../../../../components/ml_popover/types';
import { ListItems } from './types';
import { isJobStarted } from '../../../../../components/ml/helpers';
import { ML_JOB_STARTED, ML_JOB_STOPPED } from './translations';

enum MessageLevels {
  info = 'info',
  warning = 'warning',
  error = 'error',
}

const AuditIcon: React.FC<{
  message: SiemJob['auditMessage'];
}> = ({ message }) => {
  if (!message) {
    return null;
  }

  let color = 'primary';
  let icon = 'alert';

  if (message.level === MessageLevels.info) {
    icon = 'iInCircle';
  } else if (message.level === MessageLevels.warning) {
    color = 'warning';
  } else if (message.level === MessageLevels.error) {
    color = 'danger';
  }

  return (
    <EuiToolTip content={message.text}>
      <EuiIcon type={icon} color={color} />
    </EuiToolTip>
  );
};

export const JobStatusBadge: React.FC<{ job: SiemJob }> = ({ job }) => {
  const isStarted = isJobStarted(job.jobState, job.datafeedState);

  return isStarted ? (
    <EuiBadge color="secondary">{ML_JOB_STARTED}</EuiBadge>
  ) : (
    <EuiBadge color="danger">{ML_JOB_STOPPED}</EuiBadge>
  );
};

export const MlJobDescription: React.FC<{ job: SiemJob }> = ({ job }) => {
  const jobUrl = useKibana().services.application.getUrlForApp('ml#/jobs');

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiLink href={jobUrl} target="_blank">
            {job.id}
          </EuiLink>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AuditIcon message={job.auditMessage} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <JobStatusBadge job={job} />
    </>
  );
};

export const buildMlJobDescription = (
  jobId: string,
  label: string,
  siemJobs: SiemJob[]
): ListItems => {
  const siemJob = siemJobs.find(job => job.id === jobId);

  return {
    title: label,
    description: siemJob ? <MlJobDescription job={siemJob} /> : jobId,
  };
};
