/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InternalCoreSetup } from 'src/core/server';
import Boom from 'boom';

export async function createApmAgentConfigurationIndex(
  core: InternalCoreSetup
) {
  const { server } = core.http;
  const index = server
    .config()
    .get<string>('apm_oss.apmAgentConfigurationIndex');
  const { callWithInternalUser } = server.plugins.elasticsearch.getCluster(
    'admin'
  );
  const indexExists = await callWithInternalUser('indices.exists', { index });
  if (!indexExists) {
    const result = await callWithInternalUser('indices.create', {
      index,
      body: {
        settings: {
          'index.auto_expand_replicas': '0-1'
        },
        mappings: {
          properties: {
            '@timestamp': {
              type: 'date'
            },
            settings: {
              properties: {
                transaction_sample_rate: {
                  type: 'scaled_float',
                  scaling_factor: 1000,
                  ignore_malformed: true,
                  coerce: false
                }
              }
            },
            service: {
              properties: {
                name: {
                  type: 'keyword',
                  ignore_above: 1024
                },
                environment: {
                  type: 'keyword',
                  ignore_above: 1024
                }
              }
            }
          }
        }
      }
    });

    if (!result.acknowledged) {
      const err = new Error(
        `Unable to create APM Agent Configuration index '${index}'`
      );
      // eslint-disable-next-line
      console.error(err.stack);
      throw Boom.boomify(err, { statusCode: 500 });
    }
  }
}
