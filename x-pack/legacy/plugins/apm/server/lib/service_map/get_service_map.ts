/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PromiseReturnType } from '../../../typings/common';
import { rangeFilter } from '../helpers/range_filter';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters
} from '../helpers/setup_request';
import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  DESTINATION_ADDRESS,
  CONNECTION_TYPE,
  CONNECTION_SUBTYPE,
  CALLEE_NAME,
  CALLEE_ENVIRONMENT,
  CONNECTION_UPSTREAM_LIST
} from '../../../common/elasticsearch_fieldnames';

export interface IEnvOptions {
  setup: Setup & SetupTimeRange & SetupUIFilters;
  serviceName?: string;
  environment?: string;
}

interface CyNode {
  id: string;
}

interface CyEdge {
  id: string;
  source: string;
  target: string;
}

interface CyElement {
  data: CyNode | CyEdge;
}

export type ServiceMapAPIResponse = PromiseReturnType<typeof getServiceMap>;
export async function getServiceMap({
  setup,
  serviceName,
  environment
}: IEnvOptions) {
  const { start, end, client, uiFiltersES, indices } = setup;

  const params = {
    index: indices.apmServiceConnectionsIndex,
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { range: rangeFilter(start, end) },
            { exists: { field: CONNECTION_TYPE } },
            ...uiFiltersES
          ]
        }
      },
      aggs: {
        conns: {
          composite: {
            sources: [
              { [SERVICE_NAME]: { terms: { field: SERVICE_NAME } } },
              {
                [SERVICE_ENVIRONMENT]: {
                  terms: { field: SERVICE_ENVIRONMENT, missing_bucket: true }
                }
              },
              {
                [DESTINATION_ADDRESS]: {
                  terms: {
                    field: DESTINATION_ADDRESS
                  }
                }
              },
              { [CONNECTION_TYPE]: { terms: { field: CONNECTION_TYPE } } }, // will filter out regular spans etc.
              {
                [CONNECTION_SUBTYPE]: {
                  terms: { field: CONNECTION_SUBTYPE, missing_bucket: true }
                }
              }
            ],
            size: 1000
          },
          aggs: {
            dests: {
              terms: {
                field: CALLEE_NAME
              },
              aggs: {
                envs: {
                  terms: {
                    field: CALLEE_ENVIRONMENT,
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
    const upstreamEnvironment = environment || '*';

    params.body.query.bool.filter.push({
      wildcard: {
        [CONNECTION_UPSTREAM_LIST]: `${upstreamServiceName}/${upstreamEnvironment}`
      }
    });
  }

  const { aggregations } = await client.search(params);
  const buckets = aggregations?.conns.buckets ?? [];

  if (buckets.length === 0) {
    return [];
  }

  const initialServiceMapNode: CyElement = {
    data: {
      id: buckets[0].key[SERVICE_NAME]
    }
  };

  return buckets.reduce((acc: CyElement[], { key: connection, dests }) => {
    const connectionServiceName = connection[SERVICE_NAME];

    const destinationNames =
      dests.buckets.length === 0
        ? [connection[DESTINATION_ADDRESS]]
        : dests.buckets.map(
            ({ key: destinationName }) => destinationName as string
          );

    const serviceMapConnections = destinationNames.flatMap(destinationName => [
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
    ]);

    if (acc.length === 0) {
      return [initialServiceMapNode, ...serviceMapConnections];
    }
    return [...acc, ...serviceMapConnections];
  }, []);
}
