/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { kfetch } from 'ui/kfetch';
import { getJobId } from '../../../../../common/log_analysis';
import { throwErrors, createPlainError } from '../../../../../common/runtime_types';

export const callJobsSummaryAPI = async (spaceId: string, sourceId: string) => {
  const response = await kfetch({
    method: 'POST',
    pathname: '/api/ml/jobs/jobs_summary',
    body: JSON.stringify(
      fetchJobStatusRequestPayloadRT.encode({
        jobIds: [getJobId(spaceId, sourceId, 'log-entry-rate')],
      })
    ),
  });
  return fetchJobStatusResponsePayloadRT.decode(response).getOrElseL(throwErrors(createPlainError));
};

export const fetchJobStatusRequestPayloadRT = rt.type({
  jobIds: rt.array(rt.string),
});

export type FetchJobStatusRequestPayload = rt.TypeOf<typeof fetchJobStatusRequestPayloadRT>;

const datafeedStateRT = rt.keyof({
  started: null,
  stopped: null,
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
      finished_time: rt.number,
    }),
  }),
]);

export const fetchJobStatusResponsePayloadRT = rt.array(jobSummaryRT);

export type FetchJobStatusResponsePayload = rt.TypeOf<typeof fetchJobStatusResponsePayloadRT>;
