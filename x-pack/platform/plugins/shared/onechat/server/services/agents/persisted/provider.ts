/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import type { WritableAgentProvider, AgentProviderFn } from '../agent_source';
import { createClient } from './client';

export const createPersistedProviderFn =
  (opts: {
    security: SecurityServiceStart;
    elasticsearch: ElasticsearchServiceStart;
    toolsService: ToolsServiceStart;
    logger: Logger;
  }): AgentProviderFn<false> =>
  ({ request }) => {
    return createPersistedProvider({
      ...opts,
      request,
    });
  };

const createPersistedProvider = ({}: {
  request: KibanaRequest;
  security: SecurityServiceStart;
  elasticsearch: ElasticsearchServiceStart;
  toolsService: ToolsServiceStart;
  logger: Logger;
}): WritableAgentProvider => {
  const client = createClient({ elasticsearch, logger, request, security, toolsService });

  return {
    id: 'persisted',
    readonly: false,
    // TODO: implement the rest
  };
};
