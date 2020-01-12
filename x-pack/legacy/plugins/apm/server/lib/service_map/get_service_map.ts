/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PromiseReturnType } from '../../../typings/common';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters
} from '../helpers/setup_request';
import { getServiceMapFromTraceIds } from './get_service_map_from_trace_ids';
import { getTraceSampleIds } from './get_trace_sample_ids';
import { getServicesProjection } from '../../../common/projections/services';
import { mergeProjection } from '../../../common/projections/util/merge_projection';
import {
  SERVICE_AGENT_NAME,
  SERVICE_NAME
} from '../../../common/elasticsearch_fieldnames';

export interface IEnvOptions {
  setup: Setup & SetupTimeRange & SetupUIFilters;
  serviceName?: string;
  environment?: string;
  after?: string;
}

async function getConnectionData({
  setup,
  serviceName,
  environment,
  after
}: IEnvOptions) {
  const { traceIds, after: nextAfter } = await getTraceSampleIds({
    setup,
    serviceName,
    environment,
    after
  });

  const serviceMapData = traceIds.length
    ? await getServiceMapFromTraceIds({
        setup,
        serviceName,
        environment,
        traceIds
      })
    : { connections: [], discoveredServices: [] };

  return {
    after: nextAfter,
    ...serviceMapData
  };
}

async function getServicesData(options: IEnvOptions) {
  // only return services on the first request for the global service map
  if (options.after) {
    return [];
  }

  const { setup } = options;

  const projection = getServicesProjection({ setup });

  const { filter } = projection.body.query.bool;

  const params = mergeProjection(projection, {
    body: {
      size: 0,
      query: {
        bool: {
          ...projection.body.query.bool,
          filter: options.serviceName
            ? filter.concat({
                term: {
                  [SERVICE_NAME]: options.serviceName
                }
              })
            : filter
        }
      },
      aggs: {
        services: {
          terms: {
            field: projection.body.aggs.services.terms.field,
            size: 500
          },
          aggs: {
            agent_name: {
              terms: {
                field: SERVICE_AGENT_NAME
              }
            }
          }
        }
      }
    }
  });

  const { client } = setup;

  const response = await client.search(params);

  return (
    response.aggregations?.services.buckets.map(bucket => {
      return {
        'service.name': bucket.key as string,
        'agent.name':
          (bucket.agent_name.buckets[0]?.key as string | undefined) || '',
        'service.environment': options.environment || null
      };
    }) || []
  );
}

export type ServiceMapAPIResponse = PromiseReturnType<typeof getServiceMap>;
export async function getServiceMap(options: IEnvOptions) {
  const [connectionData, servicesData] = await Promise.all([
    getConnectionData(options),
    getServicesData(options)
  ]);

  return {
    ...connectionData,
    services: servicesData
  };
}
