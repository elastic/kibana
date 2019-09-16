/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { kfetch } from 'ui/kfetch';
import { getJobId } from '../../../../../common/log_analysis';

export const callCleanupMLResources = async (spaceId: string, sourceId: string) => {
  // NOTE: Deleting the jobs via this API will delete the datafeeds at the same time
  const deleteJobsResponse = await kfetch({
    method: 'POST',
    pathname: '/api/ml/jobs/delete_jobs',
    body: JSON.stringify(
      deleteJobsRequestPayloadRT.encode({
        jobIds: [getJobId(spaceId, sourceId, 'log-entry-rate')],
      })
    ),
  });

  // If for some reason we do need to delete datafeeds
  // const deleteLogRateDatafeedResponse = await kfetch({
  //   method: 'DELETE',
  //   pathname: `/api/ml/datafeeds/${getDatafeedId(spaceId, sourceId, 'log-entry-rate')}`,
  // });

  return deleteJobsResponse;
};

export const deleteJobsRequestPayloadRT = rt.type({
  jobIds: rt.array(rt.string),
});

export type DeleteJobsRequestPayload = rt.TypeOf<typeof deleteJobsRequestPayloadRT>;
