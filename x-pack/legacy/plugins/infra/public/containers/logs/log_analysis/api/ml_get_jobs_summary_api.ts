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

// TODO: Get this to align with the payload - something is tripping it up somewhere
// export const fetchJobStatusResponsePayloadRT = rt.array(rt.type({
//   datafeedId: rt.string,
//   datafeedIndices: rt.array(rt.string),
//   datafeedState: rt.string,
//   description: rt.string,
//   earliestTimestampMs: rt.number,
//   groups: rt.array(rt.string),
//   hasDatafeed: rt.boolean,
//   id: rt.string,
//   isSingleMetricViewerJob: rt.boolean,
//   jobState: rt.string,
//   latestResultsTimestampMs: rt.number,
//   latestTimestampMs: rt.number,
//   memory_status: rt.string,
//   nodeName: rt.union([rt.string, rt.undefined]),
//   processed_record_count: rt.number,
//   fullJob: rt.any,
//   auditMessage: rt.any,
//   deleting: rt.union([rt.boolean, rt.undefined]),
// }));

export const fetchJobStatusResponsePayloadRT = rt.any;

export type FetchJobStatusResponsePayload = rt.TypeOf<typeof fetchJobStatusResponsePayloadRT>;
