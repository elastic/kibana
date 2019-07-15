/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { idx } from '@kbn/elastic-idx';
import { PromiseReturnType } from '../../../typings/common';
import { rangeFilter } from '../helpers/range_filter';
import { Setup } from '../helpers/setup_request';

export interface IEnvOptions {
  setup: Setup;
  serviceName?: string;
  environment?: string;
}

export type ServiceMapAPIResponse = PromiseReturnType<typeof getConnections>;
export async function getConnections({
  setup,
  serviceName,
  environment
}: IEnvOptions) {
  const { start, end, client, config } = setup;

  const params = {
    index: config.get<string>('apm_oss.serviceMapIndexPattern'),
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { range: rangeFilter(start, end) },
            { exists: { field: 'connection.type' } }
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

  if (serviceName) {
    serviceName = serviceName + '/' + (environment ? environment : 'null');
    params.body.query.bool.filter.push({
      term: { ['connection.upstream.list']: serviceName }
    });
  }

  // console.log(JSON.stringify(params.body));

  const { aggregations } = await client.search(params);
  // console.log(JSON.stringify(aggregations));
  const buckets = idx(aggregations, _ => _.conns.buckets) || [];
  const conns = buckets.flatMap((bucket: any) => {
    const base = bucket.key;
    if (bucket.dests.buckets.length === 0) {
      // no connection found
      return base;
    } else {
      return bucket.dests.buckets.flatMap((calleeResult: any) =>
        calleeResult.envs.buckets.map((env: any) => {
          return {
            'callee.environment': env.key.length >= 0 ? env.key : null,
            'callee.name': calleeResult.key,
            // 'upstream.list': base['connection.upstream.keyword'].split('->'),
            ...base
          };
        })
      );
    }
  });

  return { conns };
}
