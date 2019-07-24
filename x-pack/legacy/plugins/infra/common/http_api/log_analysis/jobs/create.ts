/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as runtimeTypes from 'io-ts';

import { timeRangeRuntimeType } from '../../shared';

export const LOG_ANALYSIS_CREATE_JOBS_PATH = '/api/infra/log_analysis/jobs/create';

export const createJobsRequestPayloadRuntimeType = runtimeTypes.type({
  data: runtimeTypes.type({
    sourceId: runtimeTypes.string,
    categorizationFieldName: runtimeTypes.string,
    timeRange: timeRangeRuntimeType,
  }),
});

export type CreateJobsRequestPayload = runtimeTypes.TypeOf<
  typeof createJobsRequestPayloadRuntimeType
>;

export const JobTypesRuntimeType = runtimeTypes.keyof({
  entry_rate: null,
  rare_categories: null,
  high_categories: null,
});

export const createJobsSuccessReponsePayloadRuntimeType = runtimeTypes.type({
  data: runtimeTypes.type({
    jobs: runtimeTypes.array(
      runtimeTypes.type({
        jobId: runtimeTypes.string,
        jobType: JobTypesRuntimeType,
      })
    ),
  }),
});

export type CreateJobsSuccessResponsePayload = runtimeTypes.TypeOf<
  typeof createJobsSuccessReponsePayloadRuntimeType
>;

export const createJobsResponsePayloadRuntimeType = runtimeTypes.union([
  createJobsSuccessReponsePayloadRuntimeType,
]);

export type CreateJobsReponsePayload = runtimeTypes.TypeOf<
  typeof createJobsResponsePayloadRuntimeType
>;
