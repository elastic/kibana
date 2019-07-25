/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

import { badRequestErrorRT, conflictErrorRT, forbiddenErrorRT, timeRangeRT } from '../../shared';

export const LOG_ANALYSIS_CREATE_JOBS_PATH = '/api/infra/log_analysis/jobs/create';

/**
 * request
 */

export const createJobsRequestPayloadRT = rt.type({
  data: rt.type({
    sourceId: rt.string,
    categorizationFieldName: rt.string,
    timeRange: timeRangeRT,
  }),
});

export type CreateJobsRequestPayload = rt.TypeOf<typeof createJobsRequestPayloadRT>;

export const JobTypesRT = rt.keyof({
  entry_rate: null,
  rare_categories: null,
  high_categories: null,
});

/**
 * response
 */

export const createJobsSuccessReponsePayloadRuntimeType = rt.type({
  data: rt.type({
    jobs: rt.array(
      rt.type({
        jobId: rt.string,
        jobType: JobTypesRT,
      })
    ),
  }),
});

export type CreateJobsSuccessResponsePayload = rt.TypeOf<
  typeof createJobsSuccessReponsePayloadRuntimeType
>;

export const createJobsResponsePayloadRT = rt.union([
  createJobsSuccessReponsePayloadRuntimeType,
  badRequestErrorRT,
  conflictErrorRT,
  forbiddenErrorRT,
]);

export type CreateJobsReponsePayload = rt.TypeOf<typeof createJobsResponsePayloadRT>;
