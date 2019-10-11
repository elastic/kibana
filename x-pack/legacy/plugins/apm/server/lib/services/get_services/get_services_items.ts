/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { idx } from '@kbn/elastic-idx';
import { mergeProjection } from '../../../../common/projections/util/merge_projection';
import {
  PROCESSOR_EVENT,
  SERVICE_AGENT_NAME,
  SERVICE_ENVIRONMENT,
  TRANSACTION_DURATION
} from '../../../../common/elasticsearch_fieldnames';
import { PromiseReturnType } from '../../../../typings/common';
import { Setup } from '../../helpers/setup_request';
import { getServicesProjection } from '../../../../common/projections/services';

export type ServiceListAPIResponse = PromiseReturnType<typeof getServicesItems>;
export async function getServicesItems(setup: Setup) {
  const { start, end, client } = setup;

  const projection = getServicesProjection({ setup });

  const params = mergeProjection(projection, {
    body: {
      size: 0,
      aggs: {
        services: {
          terms: {
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

  const serviceBuckets = idx(aggs, _ => _.services.buckets) || [];

  const items = serviceBuckets.map(bucket => {
    const eventTypes = bucket.events.buckets;

    const transactions = eventTypes.find(e => e.key === 'transaction');
    const totalTransactions = idx(transactions, _ => _.doc_count) || 0;

    const errors = eventTypes.find(e => e.key === 'error');
    const totalErrors = idx(errors, _ => _.doc_count) || 0;

    const deltaAsMinutes = (end - start) / 1000 / 60;
    const transactionsPerMinute = totalTransactions / deltaAsMinutes;
    const errorsPerMinute = totalErrors / deltaAsMinutes;

    const environmentsBuckets = bucket.environments.buckets;
    const environments = environmentsBuckets.map(
      environmentBucket => environmentBucket.key
    );

    return {
      serviceName: bucket.key,
      agentName: idx(bucket, _ => _.agents.buckets[0].key),
      transactionsPerMinute,
      errorsPerMinute,
      avgResponseTime: bucket.avg.value,
      environments
    };
  });

  return items;
}
