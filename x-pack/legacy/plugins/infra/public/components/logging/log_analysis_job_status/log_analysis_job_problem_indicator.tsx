/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { JobStatus, SetupStatus } from '../../../../common/log_analysis';
import { JobConfigurationOutdatedCallout } from './job_configuration_outdated_callout';
import { JobDefinitionOutdatedCallout } from './job_definition_outdated_callout';
import { JobStoppedCallout } from './job_stopped_callout';

export const LogAnalysisJobProblemIndicator: React.FC<{
  jobStatus: JobStatus;
  setupStatus: SetupStatus;
  onRecreateMlJobForReconfiguration: () => void;
  onRecreateMlJobForUpdate: () => void;
}> = ({ jobStatus, setupStatus, onRecreateMlJobForReconfiguration, onRecreateMlJobForUpdate }) => {
  if (jobStatus === 'stopped') {
    return <JobStoppedCallout />;
  } else if (setupStatus === 'skippedButUpdatable') {
    return <JobDefinitionOutdatedCallout onRecreateMlJob={onRecreateMlJobForUpdate} />;
  } else if (setupStatus === 'skippedButReconfigurable') {
    return <JobConfigurationOutdatedCallout onRecreateMlJob={onRecreateMlJobForReconfiguration} />;
  }

  return null; // no problem to indicate
};
