/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import Boom from 'boom';

export async function createApmAgentConfigurationIndex(server: Server) {
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
        mappings: {
          properties: {
            '@timestamp': {
              type: 'date'
            },
            settings: {
              properties: {
                sample_rate: {
                  type: 'text'
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
