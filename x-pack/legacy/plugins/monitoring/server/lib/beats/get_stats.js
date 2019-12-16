/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { checkParam } from '../error_missing_required';
import { createBeatsQuery } from './create_beats_query';
import { beatsAggFilterPath, beatsUuidsAgg, beatsAggResponseHandler } from './_beats_stats';

export function handleResponse(...args) {
  const { beatTotal, beatTypes, totalEvents, bytesSent } = beatsAggResponseHandler(...args);

  return {
    total: beatTotal,
    types: beatTypes,
    stats: {
      totalEvents,
      bytesSent,
    },
  };
}

export async function getStats(req, beatsIndexPattern, clusterUuid) {
  checkParam(beatsIndexPattern, 'beatsIndexPattern in getBeats');

  const config = req.server.config();
  const start = moment.utc(req.payload.timeRange.min).valueOf();
  const end = moment.utc(req.payload.timeRange.max).valueOf();
  const maxBucketSize = config.get('xpack.monitoring.max_bucket_size');

  const params = {
    index: beatsIndexPattern,
    filterPath: beatsAggFilterPath,
    size: 0,
    ignoreUnavailable: true,
    body: {
      query: createBeatsQuery({
        start,
        end,
        clusterUuid,
      }),
      aggs: beatsUuidsAgg(maxBucketSize),
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const response = await callWithRequest(req, 'search', params);

  return handleResponse(response, start, end);
}
