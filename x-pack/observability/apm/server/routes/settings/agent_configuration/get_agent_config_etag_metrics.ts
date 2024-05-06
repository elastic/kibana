/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { termQuery, rangeQuery } from '@kbn/observability-plugin/server';
import datemath from '@kbn/datemath';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { METRICSET_NAME } from '../../../../common/es_fields/apm';

export async function getAgentConfigEtagMetrics(
  apmEventClient: APMEventClient,
  etag?: string
) {
  const params = {
    apm: {
      events: [ProcessorEvent.metric],
    },
    body: {
      track_total_hits: 0,
      size: 0,
      query: {
        bool: {
          filter: [
            ...termQuery(METRICSET_NAME, 'agent_config'),
            ...termQuery('labels.etag', etag),
            ...rangeQuery(
              datemath.parse('now-15m')!.valueOf(),
              datemath.parse('now')!.valueOf()
            ),
          ],
        },
      },
      aggs: {
        config_by_etag: {
          terms: {
            field: 'labels.etag',
            size: 200,
          },
        },
      },
    },
  };

  const response = await apmEventClient.search(
    'get_agent_config_etag_metrics',
    params
  );

  return (
    response.aggregations?.config_by_etag.buckets.map(
      ({ key }) => key as string
    ) ?? []
  );
}
