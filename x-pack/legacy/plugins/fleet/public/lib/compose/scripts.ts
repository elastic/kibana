/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RestAgentAdapter } from '../adapters/agent/rest_agent_adapter';
import { MemoryElasticsearchAdapter } from '../adapters/elasticsearch/memory';
import { TestingFrameworkAdapter } from '../adapters/framework/testing_framework_adapter';
import { NodeAxiosAPIAdapter } from '../adapters/rest_api/node_axios_api_adapter';
import { AgentsLib } from '../agent';
import { ElasticsearchLib } from '../elasticsearch';
import { FrameworkLib } from '../framework';
import { FrontendLibs } from '../types';

export function compose(basePath: string): FrontendLibs {
  const api = new NodeAxiosAPIAdapter('elastic', 'changeme', basePath);
  const esAdapter = new MemoryElasticsearchAdapter(() => true, () => '', []);
  const elasticsearchLib = new ElasticsearchLib(esAdapter);

  const agents = new AgentsLib(new RestAgentAdapter(api), elasticsearchLib);

  const framework = new FrameworkLib(
    new TestingFrameworkAdapter(
      {
        basePath,
        license: {
          type: 'gold',
          expired: false,
          expiry_date_in_millis: 34353453452345,
        },
        security: {
          enabled: true,
          available: true,
        },
        settings: {},
      },
      {
        username: 'joeuser',
        roles: ['fleet_admin'],
        enabled: true,
        full_name: null,
        email: null,
      },
      '6.7.0'
    )
  );

  const libs: FrontendLibs = {
    framework,
    elasticsearch: elasticsearchLib,
    agents,
  };
  return libs;
}
