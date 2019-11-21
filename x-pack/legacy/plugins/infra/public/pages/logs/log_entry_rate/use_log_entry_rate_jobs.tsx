/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate';
import { useMemo } from 'react';

import { bucketSpan } from '../../../../common/log_analysis';
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
  const jobOverrides = useMemo(
    () => [
      {
        job_id: 'log-entry-rate' as const,
        analysis_config: {
          bucket_span: `${bucketSpan}ms`,
        },
        data_description: {
          time_field: timeField,
        },
        custom_settings: {
          logs_source_config: {
            indexPattern,
            timestampField: timeField,
            bucketSpan,
          },
        },
      },
    ],
    [bucketSpan, timeField, indexPattern]
  );
  const datafeedOverrides = useMemo(() => [], []);

  return useLogAnalysisJobs({
    bucketSpan,
    datafeedOverrides,
    indexPattern,
    jobOverrides,
    jobTypes,
    moduleId: 'logs_ui_analysis',
    sourceId,
    spaceId,
    timestampField: timeField,
  });
};

export const [LogEntryRateJobsProvider, useLogEntryRateJobsContext] = createContainer(
  useLogEntryRateJobs
);
