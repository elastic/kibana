/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PDF_JOB_TYPE as jobType } from '../../common/constants';
import { ExportTypeDefinition, ESQueueCreateJobFn, ESQueueWorkerExecuteFn } from '../../types';
import { createJobFactory } from './server/create_job';
import { executeJobFactory } from './server/execute_job';
import { metadata } from './metadata';
import { JobParamsPDF, JobDocPayloadPDF } from './types';

export const getExportType = (): ExportTypeDefinition<
  JobParamsPDF,
  ESQueueCreateJobFn<JobParamsPDF>,
  JobDocPayloadPDF,
  ESQueueWorkerExecuteFn<JobDocPayloadPDF>
> => ({
  ...metadata,
  jobType,
  jobContentEncoding: 'base64',
  jobContentExtension: 'pdf',
  createJobFactory,
  executeJobFactory,
  validLicenses: ['trial', 'standard', 'gold', 'platinum'],
});
