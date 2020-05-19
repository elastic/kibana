/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CSV_FROM_SAVEDOBJECT_JOB_TYPE,
  LICENSE_TYPE_BASIC,
  LICENSE_TYPE_ENTERPRISE,
  LICENSE_TYPE_GOLD,
  LICENSE_TYPE_PLATINUM,
  LICENSE_TYPE_STANDARD,
  LICENSE_TYPE_TRIAL,
} from '../../common/constants';
import { ExportTypeDefinition } from '../../server/types';
import { metadata } from './metadata';
import { createJobFactory, ImmediateCreateJobFn } from './server/create_job';
import { executeJobFactory, ImmediateExecuteFn } from './server/execute_job';
import { JobParamsPanelCsv } from './types';

/*
 * These functions are exported to share with the API route handler that
 * generates csv from saved object immediately on request.
 */
export { createJobFactory } from './server/create_job';
export { executeJobFactory } from './server/execute_job';

export const getExportType = (): ExportTypeDefinition<
  JobParamsPanelCsv,
  ImmediateCreateJobFn<JobParamsPanelCsv>,
  JobParamsPanelCsv,
  ImmediateExecuteFn<JobParamsPanelCsv>
> => ({
  ...metadata,
  jobType: CSV_FROM_SAVEDOBJECT_JOB_TYPE,
  jobContentExtension: 'csv',
  createJobFactory,
  executeJobFactory,
  validLicenses: [
    LICENSE_TYPE_TRIAL,
    LICENSE_TYPE_BASIC,
    LICENSE_TYPE_STANDARD,
    LICENSE_TYPE_GOLD,
    LICENSE_TYPE_PLATINUM,
    LICENSE_TYPE_ENTERPRISE,
  ],
});
