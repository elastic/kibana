/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { idx } from '@kbn/elastic-idx';
import {
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME
} from '../../../common/elasticsearch_fieldnames';
import { rangeFilter } from '../helpers/range_filter';
import { Setup } from '../helpers/setup_request';
import { ENVIRONMENT_NOT_DEFINED } from '../../../common/environment_filter_values';
import { ESFilter } from '../../../typings/elasticsearch';

export async function getEnvironments(setup: Setup, serviceName?: string) {
  const { start, end, client, indices } = setup;

  const filter: ESFilter[] = [
    { terms: { [PROCESSOR_EVENT]: ['transaction', 'error', 'metric'] } },
    { range: rangeFilter(start, end) }
  ];

  if (serviceName) {
    filter.push({
      term: { [SERVICE_NAME]: serviceName }
    });
  }

  const params = {
    index: [
      indices['apm_oss.metricsIndices'],
      indices['apm_oss.errorIndices'],
      indices['apm_oss.transactionIndices']
    ],
    body: {
      size: 0,
      query: {
        bool: {
          filter
        }
      },
      aggs: {
        environments: {
          terms: {
            field: SERVICE_ENVIRONMENT,
            missing: ENVIRONMENT_NOT_DEFINED
          }
        }
      }
    }
  };

  const resp = await client.search(params);
  const aggs = resp.aggregations;
  const environmentsBuckets = idx(aggs, _ => _.environments.buckets) || [];

  const environments = environmentsBuckets.map(
    environmentBucket => environmentBucket.key as string
  );

  return environments;
}
