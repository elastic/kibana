/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mergeProjection } from '../../../../common/projections/util/merge_projection';
import {
  PROCESSOR_EVENT,
  SERVICE_AGENT_NAME,
  SERVICE_ENVIRONMENT,
  TRANSACTION_DURATION
} from '../../../../common/elasticsearch_fieldnames';
import { PromiseReturnType } from '../../../../typings/common';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters
} from '../../helpers/setup_request';
import { getServicesProjection } from '../../../../common/projections/services';

export type ServiceListAPIResponse = PromiseReturnType<typeof getServicesItems>;
export async function getServicesItems(
  setup: Setup & SetupTimeRange & SetupUIFilters
) {
  const { start, end, client } = setup;

  const projection = getServicesProjection({ setup });

  const params = mergeProjection(projection, {
    body: {
      size: 0,
      aggs: {
        services: {
          terms: {
            ...projection.body.aggs.services.terms,
            size: 500
          },
          aggs: {
            avg: {
              avg: { field: TRANSACTION_DURATION }
            },
            agents: {
              terms: { field: SERVICE_AGENT_NAME, size: 1 }
            },
            events: {
              terms: { field: PROCESSOR_EVENT, size: 2 }
            },
            environments: {
              terms: { field: SERVICE_ENVIRONMENT }
            }
          }
        }
      }
    }
  });

  const resp = await client.search(params);
  const aggs = resp.aggregations;

  const serviceBuckets = aggs?.services.buckets || [];

  const items = serviceBuckets.map(bucket => {
    const eventTypes = bucket.events.buckets;

    const transactions = eventTypes.find(e => e.key === 'transaction');
    const totalTransactions = transactions?.doc_count || 0;

    const errors = eventTypes.find(e => e.key === 'error');
    const totalErrors = errors?.doc_count || 0;

    const deltaAsMinutes = (end - start) / 1000 / 60;
    const transactionsPerMinute = totalTransactions / deltaAsMinutes;
    const errorsPerMinute = totalErrors / deltaAsMinutes;

    const environmentsBuckets = bucket.environments.buckets;
    const environments = environmentsBuckets.map(
      environmentBucket => environmentBucket.key as string
    );

    return {
      serviceName: bucket.key as string,
      agentName: bucket.agents.buckets[0]?.key as string | undefined,
      transactionsPerMinute,
      errorsPerMinute,
      avgResponseTime: bucket.avg.value,
      environments
    };
  });

  return items;
}
