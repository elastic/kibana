/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as Joi from 'joi';
import { resolve } from 'path';
import { PLUGIN } from './common/constants';
import { CONFIG_PREFIX } from './common/constants/plugin';
import { initServerWithKibana } from './server/kibana.index';

export const config = Joi.object({
  enabled: Joi.boolean().default(true),
}).default();

export function ingest(kibana: any) {
  return new kibana.Plugin({
    id: PLUGIN.ID,
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    publicDir: resolve(__dirname, 'public'),
    config: () => config,
    configPrefix: CONFIG_PREFIX,
    uiExports: {
      mappings: {
        configurations: {
          properties: {
            name: {
              type: 'text',
            },
            description: {
              type: 'text',
            },
            output: {
              type: 'keyword',
            },
            monitoring_enabled: {
              type: 'boolean',
            },
            agent_version: {
              type: 'keyword',
            },
            data_sources: {
              properties: {
                uuid: {
                  type: 'keyword',
                },
                ref_source: {
                  type: 'keyword',
                },
                ref: {
                  type: 'keyword',
                },
                config: {
                  type: 'keyword',
                },
                inputs: {
                  type: 'keyword',
                },
              },
            },
            shared_id: {
              type: 'keyword',
            },
            version: {
              type: 'integer',
            },
            active: {
              type: 'boolean',
            },
            updated_at: {
              type: 'date',
            },
            created_by: {
              type: 'text',
            },
            updated_on: {
              type: 'date',
            },
            updated_by: {
              type: 'text',
            },
          },
        },
      },
    },
    init(server: any) {
      initServerWithKibana(server);
    },
  });
}
