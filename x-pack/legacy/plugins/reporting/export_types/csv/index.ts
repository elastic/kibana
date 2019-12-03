/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CSV_JOB_TYPE as jobType } from '../../common/constants';
import { ExportTypeDefinition, ESQueueCreateJobFn, ESQueueWorkerExecuteFn } from '../../types';
import { metadata } from './metadata';
import { createJobFactory } from './server/create_job';
import { executeJobFactory } from './server/execute_job';
import { JobParamsDiscoverCsv, JobDocPayloadDiscoverCsv } from './types';

export const getExportType = (): ExportTypeDefinition<
  JobParamsDiscoverCsv,
  ESQueueCreateJobFn<JobParamsDiscoverCsv>,
  JobDocPayloadDiscoverCsv,
  ESQueueWorkerExecuteFn<JobDocPayloadDiscoverCsv>
> => ({
  ...metadata,
  jobType,
  jobContentExtension: 'csv',
  createJobFactory,
  executeJobFactory,
  validLicenses: ['trial', 'basic', 'standard', 'gold', 'platinum'],
});
