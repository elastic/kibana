/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate';

import { useLogAnalysisJobs } from '../../../containers/logs/log_analysis';

const jobTypes = ['log-entry-rate'];

export const useLogEntryRateJobs = ({
  indexPattern,
  sourceId,
  spaceId,
  timeField,
}: {
  indexPattern: string;
  sourceId: string;
  spaceId: string;
  timeField: string;
}) => {
  return useLogAnalysisJobs({
    indexPattern,
    jobTypes,
    moduleId: 'logs_ui_analysis',
    sourceId,
    spaceId,
    timeField,
  });
};

export const [LogEntryRateJobsProvider, useLogEntryRateJobsContext] = createContainer(
  useLogEntryRateJobs
);
