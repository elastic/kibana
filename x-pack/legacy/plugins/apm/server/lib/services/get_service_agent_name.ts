/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { idx } from '@kbn/elastic-idx';
import {
  PROCESSOR_EVENT,
  SERVICE_AGENT_NAME,
  SERVICE_NAME
} from '../../../common/elasticsearch_fieldnames';
import { PromiseReturnType } from '../../../typings/common';
import { rangeFilter } from '../helpers/range_filter';
import { Setup } from '../helpers/setup_request';

export type ServiceAgentNameAPIResponse = PromiseReturnType<
  typeof getServiceAgentName
>;
export async function getServiceAgentName(serviceName: string, setup: Setup) {
  const { start, end, client, config } = setup;

  const params = {
    terminate_after: 1,
    index: [
      config.get<string>('apm_oss.errorIndices'),
      config.get<string>('apm_oss.transactionIndices'),
      config.get<string>('apm_oss.metricsIndices')
    ],
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            {
              terms: { [PROCESSOR_EVENT]: ['error', 'transaction', 'metric'] }
            },
            { range: rangeFilter(start, end) }
          ]
        }
      },
      aggs: {
        agents: {
          terms: { field: SERVICE_AGENT_NAME, size: 1 }
        }
      }
    }
  };

  const { aggregations } = await client.search(params);
  const agentName = idx(aggregations, _ => _.agents.buckets[0].key);
  return { agentName };
}
