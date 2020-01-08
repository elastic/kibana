/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DeleteJobsResponsePayload } from './api/ml_cleanup';
import { FetchJobStatusResponsePayload } from './api/ml_get_jobs_summary_api';
import { GetMlModuleResponsePayload } from './api/ml_get_module';
import { SetupMlModuleResponsePayload } from './api/ml_setup_module_api';
import { ValidationIndicesResponsePayload } from '../../../../common/http_api/log_analysis';

export interface ModuleDescriptor<JobType extends string> {
  moduleId: string;
  jobTypes: JobType[];
  bucketSpan: number;
  getJobIds: (spaceId: string, sourceId: string) => Record<JobType, string>;
  getJobSummary: (spaceId: string, sourceId: string) => Promise<FetchJobStatusResponsePayload>;
  getModuleDefinition: () => Promise<GetMlModuleResponsePayload>;
  setUpModule: (
    start: number | undefined,
    end: number | undefined,
    sourceConfiguration: ModuleSourceConfiguration
  ) => Promise<SetupMlModuleResponsePayload>;
  cleanUpModule: (spaceId: string, sourceId: string) => Promise<DeleteJobsResponsePayload>;
  validateSetupIndices: (
    sourceConfiguration: ModuleSourceConfiguration
  ) => Promise<ValidationIndicesResponsePayload>;
}

export interface ModuleSourceConfiguration {
  indices: string[];
  sourceId: string;
  spaceId: string;
  timestampField: string;
}
