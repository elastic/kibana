/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  LICENSE_TYPE_ENTERPRISE,
  LICENSE_TYPE_GOLD,
  LICENSE_TYPE_PLATINUM,
  LICENSE_TYPE_STANDARD,
  LICENSE_TYPE_TRIAL,
  PDF_JOB_TYPE as jobType,
} from '../../common/constants';
import {
  ESQueueCreateJobFn,
  ESQueueWorkerExecuteFn,
  ExportTypeDefinition,
} from '../../server/types';
import { metadata } from './metadata';
import { createJobFactory } from './server/create_job';
import { executeJobFactory } from './server/execute_job';
import { JobDocPayloadPDF, JobParamsPDF } from './types';

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
  validLicenses: [
    LICENSE_TYPE_TRIAL,
    LICENSE_TYPE_STANDARD,
    LICENSE_TYPE_GOLD,
    LICENSE_TYPE_PLATINUM,
    LICENSE_TYPE_ENTERPRISE,
  ],
});
