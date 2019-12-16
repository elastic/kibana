/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  PROCESSOR_EVENT,
  SERVICE_AGENT_NAME,
  SERVICE_NAME
} from '../../../common/elasticsearch_fieldnames';
import { rangeFilter } from '../helpers/range_filter';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { ProcessorEvent } from '../../../common/processor_event';

export async function getServiceAgentName(
  serviceName: string,
  setup: Setup & SetupTimeRange
) {
  const { start, end, client, indices } = setup;

  const params = {
    terminateAfter: 1,
    index: [
      indices['apm_oss.errorIndices'],
      indices['apm_oss.transactionIndices'],
      indices['apm_oss.metricsIndices']
    ],
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            {
              terms: {
                [PROCESSOR_EVENT]: [
                  ProcessorEvent.error,
                  ProcessorEvent.transaction,
                  ProcessorEvent.metric
                ]
              }
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
  const agentName = aggregations?.agents.buckets[0]?.key as string | undefined;
  return { agentName };
}
