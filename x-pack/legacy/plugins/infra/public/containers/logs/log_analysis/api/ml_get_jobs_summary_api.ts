/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import * as rt from 'io-ts';
import { kfetch } from 'ui/kfetch';

import { jobCustomSettingsRT } from './ml_api_types';
import { throwErrors, createPlainError } from '../../../../../common/runtime_types';
import { getJobId } from '../../../../../common/log_analysis';

export const callJobsSummaryAPI = async <JobType extends string>(
  spaceId: string,
  sourceId: string,
  jobTypes: JobType[]
) => {
  const response = await kfetch({
    method: 'POST',
    pathname: '/api/ml/jobs/jobs_summary',
    body: JSON.stringify(
      fetchJobStatusRequestPayloadRT.encode({
        jobIds: jobTypes.map(jobType => getJobId(spaceId, sourceId, jobType)),
      })
    ),
  });
  return pipe(
    fetchJobStatusResponsePayloadRT.decode(response),
    fold(throwErrors(createPlainError), identity)
  );
};

export const fetchJobStatusRequestPayloadRT = rt.type({
  jobIds: rt.array(rt.string),
});

export type FetchJobStatusRequestPayload = rt.TypeOf<typeof fetchJobStatusRequestPayloadRT>;

const datafeedStateRT = rt.keyof({
  started: null,
  stopped: null,
  '': null,
});

const jobStateRT = rt.keyof({
  closed: null,
  closing: null,
  failed: null,
  opened: null,
  opening: null,
});

export const jobSummaryRT = rt.intersection([
  rt.type({
    id: rt.string,
    jobState: jobStateRT,
  }),
  rt.partial({
    datafeedIndices: rt.array(rt.string),
    datafeedState: datafeedStateRT,
    fullJob: rt.partial({
      custom_settings: jobCustomSettingsRT,
      finished_time: rt.number,
    }),
  }),
]);

export type JobSummary = rt.TypeOf<typeof jobSummaryRT>;

export const fetchJobStatusResponsePayloadRT = rt.array(jobSummaryRT);

export type FetchJobStatusResponsePayload = rt.TypeOf<typeof fetchJobStatusResponsePayloadRT>;
