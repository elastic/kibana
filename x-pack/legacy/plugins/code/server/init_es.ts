/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { RepositoryIndexInitializerFactory } from './indexer';
import { RepositoryConfigController } from './repository_config_controller';
import { EsClientWithInternalRequest } from './utils/esclient_with_internal_request';
import { EsClient } from './lib/esqueue';
import { Logger } from './log';

export async function initEs(server: Server, log: Logger) {
  // wait until elasticsearch is ready
  await server.plugins.elasticsearch.waitUntilReady();
  const esClient: EsClient = new EsClientWithInternalRequest(server);
  const repoConfigController = new RepositoryConfigController(esClient);
  const repoIndexInitializerFactory = new RepositoryIndexInitializerFactory(esClient, log);
  return {
    esClient,
    repoConfigController,
    repoIndexInitializerFactory,
  };
}
