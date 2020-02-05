/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { createApmQuery } from './create_apm_query';
import { ApmClusterMetric } from '../metrics';

export async function getTimeOfLastEvent({
  req,
  callWithRequest,
  apmIndexPattern,
  start,
  end,
  clusterUuid,
}) {
  const params = {
    index: apmIndexPattern,
    size: 1,
    ignoreUnavailable: true,
    body: {
      _source: ['timestamp'],
      sort: [
        {
          timestamp: {
            order: 'desc',
          },
        },
      ],
      query: createApmQuery({
        start,
        end,
        clusterUuid,
        metric: ApmClusterMetric.getMetricFields(),
        filters: [
          {
            range: {
              'beats_stats.metrics.libbeat.output.events.acked': {
                gt: 0,
              },
            },
          },
        ],
      }),
    },
  };

  const response = await callWithRequest(req, 'search', params);
  return get(response, 'hits.hits[0]._source.timestamp');
}
