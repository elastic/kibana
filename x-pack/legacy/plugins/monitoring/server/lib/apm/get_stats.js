/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { checkParam } from '../error_missing_required';
import { createApmQuery } from './create_apm_query';
import { apmAggFilterPath, apmUuidsAgg, apmAggResponseHandler } from './_apm_stats';
import { getTimeOfLastEvent } from './_get_time_of_last_event';

export function handleResponse(...args) {
  const { apmTotal, totalEvents, bytesSent } = apmAggResponseHandler(...args);

  return {
    bytesSent,
    totalEvents,
    apms: {
      total: apmTotal,
    },
  };
}

export async function getStats(req, apmIndexPattern, clusterUuid) {
  checkParam(apmIndexPattern, 'apmIndexPattern in getBeats');

  const config = req.server.config();
  const start = moment.utc(req.payload.timeRange.min).valueOf();
  const end = moment.utc(req.payload.timeRange.max).valueOf();
  const maxBucketSize = config.get('xpack.monitoring.max_bucket_size');

  const params = {
    index: apmIndexPattern,
    filterPath: apmAggFilterPath,
    size: 0,
    ignoreUnavailable: true,
    body: {
      query: createApmQuery({
        start,
        end,
        clusterUuid,
      }),
      aggs: apmUuidsAgg(maxBucketSize),
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const [response, timeOfLastEvent] = await Promise.all([
    callWithRequest(req, 'search', params),
    getTimeOfLastEvent({
      req,
      callWithRequest,
      apmIndexPattern,
      start,
      end,
      clusterUuid,
    }),
  ]);

  const formattedResponse = handleResponse(response, start, end);
  return {
    ...formattedResponse,
    timeOfLastEvent,
  };
}
