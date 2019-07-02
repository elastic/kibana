/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup } from '../../../helpers/setup_request';
import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT
} from '../../../../../common/elasticsearch_fieldnames';
import { ENVIRONMENT_NOT_DEFINED } from '../../../../../common/environment_filter_values';

export async function getUnavailableEnvironments({
  serviceName,
  setup
}: {
  serviceName: string;
  setup: Setup;
}) {
  const { client, config } = setup;

  const params = {
    index: config.get<string>('apm_oss.cmIndex'),
    body: {
      size: 0,
      query: {
        bool: {
          filter: [{ term: { [SERVICE_NAME]: serviceName } }]
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
  const buckets = resp.aggregations.environments.buckets;
  return buckets.map(bucket => bucket.key);
}
