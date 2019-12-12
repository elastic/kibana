/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  PNG_JOB_TYPE as jobType,
  LICENSE_TYPE_TRIAL,
  LICENSE_TYPE_STANDARD,
  LICENSE_TYPE_GOLD,
  LICENSE_TYPE_PLATINUM,
  LICENSE_TYPE_ENTERPRISE,
} from '../../common/constants';
import { ExportTypeDefinition, ESQueueCreateJobFn, ESQueueWorkerExecuteFn } from '../../types';
import { createJobFactory } from './server/create_job';
import { executeJobFactory } from './server/execute_job';
import { metadata } from './metadata';
import { JobParamsPNG, JobDocPayloadPNG } from './types';

export const getExportType = (): ExportTypeDefinition<
  JobParamsPNG,
  ESQueueCreateJobFn<JobParamsPNG>,
  JobDocPayloadPNG,
  ESQueueWorkerExecuteFn<JobDocPayloadPNG>
> => ({
  ...metadata,
  jobType,
  jobContentEncoding: 'base64',
  jobContentExtension: 'PNG',
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
