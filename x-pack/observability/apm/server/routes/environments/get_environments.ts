/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
} from '../../../common/es_fields/apm';
import { ENVIRONMENT_NOT_DEFINED } from '../../../common/environment_filter_values';
import { getProcessorEventForTransactions } from '../../lib/helpers/transactions';
import { Environment } from '../../../common/environment_rt';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

/**
 * This is used for getting the list of environments for the environment selector,
 * filtered by range.
 */
export async function getEnvironments({
  searchAggregatedTransactions,
  serviceName,
  apmEventClient,
  size,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  serviceName?: string;
  searchAggregatedTransactions: boolean;
  size: number;
  start: number;
  end: number;
}): Promise<Environment[]> {
  const operationName = serviceName
    ? 'get_environments_for_service'
    : 'get_environments';

  const params = {
    apm: {
      events: [
        getProcessorEventForTransactions(searchAggregatedTransactions),
        ProcessorEvent.metric,
        ProcessorEvent.error,
      ],
    },
    body: {
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            ...rangeQuery(start, end),
            ...termQuery(SERVICE_NAME, serviceName),
          ],
        },
      },
      aggs: {
        environments: {
          terms: {
            field: SERVICE_ENVIRONMENT,
            missing: ENVIRONMENT_NOT_DEFINED.value,
            size,
          },
        },
      },
    },
  };

  const resp = await apmEventClient.search(operationName, params);
  const aggs = resp.aggregations;
  const environmentsBuckets = aggs?.environments.buckets || [];

  const environments = environmentsBuckets.map(
    (environmentBucket) => environmentBucket.key as string
  );

  return environments as Environment[];
}
