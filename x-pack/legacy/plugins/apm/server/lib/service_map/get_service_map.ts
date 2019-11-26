/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { idx } from '@kbn/elastic-idx';
import { PromiseReturnType } from '../../../typings/common';
import { rangeFilter } from '../helpers/range_filter';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters
} from '../helpers/setup_request';
import { ENVIRONMENT_NOT_DEFINED } from '../../../common/environment_filter_values';

export interface IEnvOptions {
  setup: Setup & SetupTimeRange & SetupUIFilters;
  serviceName?: string;
  environment?: string;
}

export type ServiceMapAPIResponse = PromiseReturnType<typeof getServiceMap>;
export async function getServiceMap({
  setup,
  serviceName,
  environment
}: IEnvOptions) {
  const { start, end, client, config, uiFiltersES } = setup;

  const params = {
    index: config['xpack.apm.serviceMapIndexPattern'],
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { range: rangeFilter(start, end) },
            { exists: { field: 'connection.type' } },
            ...uiFiltersES
          ]
        }
      },
      aggs: {
        conns: {
          composite: {
            sources: [
              { 'service.name': { terms: { field: 'service.name' } } },
              {
                'service.environment': {
                  terms: { field: 'service.environment', missing_bucket: true }
                }
              },
              {
                'destination.address': {
                  terms: {
                    field: 'destination.address'
                  }
                }
              },
              { 'connection.type': { terms: { field: 'connection.type' } } }, // will filter out regular spans etc.
              {
                'connection.subtype': {
                  terms: { field: 'connection.subtype', missing_bucket: true }
                }
              }
            ],
            size: 1000
          },
          aggs: {
            dests: {
              terms: {
                field: 'callee.name'
              },
              aggs: {
                envs: {
                  terms: {
                    field: 'callee.environment',
                    missing: ''
                  }
                }
              }
            }
          }
        }
      }
    }
  };

  if (serviceName || environment) {
    const upstreamServiceName = serviceName || '*';

    let upstreamEnvironment = '*';
    if (environment) {
      upstreamEnvironment =
        environment === ENVIRONMENT_NOT_DEFINED ? 'null' : environment;
    }

    params.body.query.bool.filter.push({
      wildcard: {
        ['connection.upstream.list']: `${upstreamServiceName}/${upstreamEnvironment}`
      }
    });
  }

  // @ts-ignore
  const { aggregations } = await client.search(params);
  const buckets: Array<{
    key: {
      'service.name': string;
      'service.environment': string | null;
      'destination.address': string;
      'connection.type': string;
      'connection.subtype': string | null;
    };
    dests: {
      buckets: Array<{
        key: string;
        envs: {
          buckets: Array<{ key: string }>;
        };
      }>;
    };
  }> = idx(aggregations, _ => _.conns.buckets) || [];

  return buckets.reduce(
    (acc, { key: connection, dests }) => {
      const connectionServiceName = connection['service.name'];
      let destinationNames = dests.buckets.map(
        ({ key: destinationName }) => destinationName
      );
      if (destinationNames.length === 0) {
        destinationNames = [connection['destination.address']];
      }

      const serviceMapConnections = destinationNames.flatMap(
        destinationName => [
          {
            data: {
              id: destinationName
            }
          },
          {
            data: {
              id: `${connectionServiceName}~${destinationName}`,
              source: connectionServiceName,
              target: destinationName
            }
          }
        ]
      );

      return [...acc, ...serviceMapConnections];
    },
    buckets.length
      ? [
          {
            data: {
              id: buckets[0].key['service.name']
            }
          }
        ]
      : []
  );
}
