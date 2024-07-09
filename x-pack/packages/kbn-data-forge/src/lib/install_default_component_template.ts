/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { Config } from '../types';

const eventIngestedCommonComponentTemplate = {
  _meta: {
    documentation: 'https://www.elastic.co/guide/en/ecs/current/ecs-event.html',
    ecs_version: '8.0.0',
  },
  template: {
    mappings: {
      properties: {
        event: {
          properties: {
            ingested: {
              type: 'date',
            },
          },
        },
      },
    },
  },
};

export async function installDefaultComponentTemplate(
  _config: Config,
  client: Client,
  _logger: ToolingLog
) {
  await client.cluster.putComponentTemplate({
    name: `kbn-data-forge_base`,
    ...eventIngestedCommonComponentTemplate,
  });
}
