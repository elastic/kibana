/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { idx } from '@kbn/elastic-idx';
import { Setup } from '../../../helpers/setup_request';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  SERVICE_ENVIRONMENT
} from '../../../../../common/elasticsearch_fieldnames';
import { ENVIRONMENT_NOT_DEFINED } from '../../../../../common/environment_filter_values';

export async function getAllEnvironments({
  serviceName,
  setup
}: {
  serviceName: string;
  setup: Setup;
}) {
  const { client, config } = setup;

  const params = {
    index: [
      config.get<string>('apm_oss.metricsIndices'),
      config.get<string>('apm_oss.errorIndices'),
      config.get<string>('apm_oss.transactionIndices')
    ],
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              terms: { [PROCESSOR_EVENT]: ['transaction', 'error', 'metric'] }
            },
            { term: { [SERVICE_NAME]: serviceName } }
          ]
        }
      },
      aggs: {
        environments: {
          terms: {
            field: SERVICE_ENVIRONMENT,
            missing: ENVIRONMENT_NOT_DEFINED,
            size: 100
          }
        }
      }
    }
  };

  const resp = await client.search(params);
  const buckets = idx(resp.aggregations, _ => _.environments.buckets) || [];
  return buckets.map(bucket => bucket.key);
}
