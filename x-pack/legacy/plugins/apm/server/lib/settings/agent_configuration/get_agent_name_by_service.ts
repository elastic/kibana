/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup } from '../../helpers/setup_request';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME
} from '../../../../common/elasticsearch_fieldnames';
import { SERVICE_AGENT_NAME } from '../../../../common/elasticsearch_fieldnames';

export async function getAgentNameByService({
  serviceName,
  setup
}: {
  serviceName: string;
  setup: Setup;
}) {
  const { client, indices } = setup;

  const params = {
    terminateAfter: 1,
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
            {
              terms: { [PROCESSOR_EVENT]: ['transaction', 'error', 'metric'] }
            },
            { term: { [SERVICE_NAME]: serviceName } }
          ]
        }
      },
      aggs: {
        agent_names: {
          terms: { field: SERVICE_AGENT_NAME, size: 1 }
        }
      }
    }
  };

  const { aggregations } = await client.search(params);
  const agentName = aggregations?.agent_names.buckets[0].key as
    | string
    | undefined;
  return { agentName };
}
