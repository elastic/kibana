/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { idx } from '@kbn/elastic-idx';
import { Setup } from '../../helpers/setup_request';
import { PromiseReturnType } from '../../../../typings/common';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME
} from '../../../../common/elasticsearch_fieldnames';
import { ALL_OPTION_VALUE } from '../../../../common/agent_configuration_constants';

export type AgentConfigurationServicesAPIResponse = PromiseReturnType<
  typeof getServiceNames
>;
export async function getServiceNames({ setup }: { setup: Setup }) {
  const { client, indices } = setup;

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
          filter: [
            { terms: { [PROCESSOR_EVENT]: ['transaction', 'error', 'metric'] } }
          ]
        }
      },
      aggs: {
        services: {
          terms: {
            field: SERVICE_NAME,
            size: 50
          }
        }
      }
    }
  };

  const resp = await client.search(params);
  const buckets = idx(resp.aggregations, _ => _.services.buckets) || [];
  const serviceNames = buckets.map(bucket => bucket.key as string).sort();
  return [ALL_OPTION_VALUE, ...serviceNames];
}
