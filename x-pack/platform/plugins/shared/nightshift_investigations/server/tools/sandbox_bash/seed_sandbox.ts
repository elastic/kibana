/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { SandboxApiClient } from './grpc_client';
import type { ConnectorSource } from './connector_sources';
import { renderConnectorFiles } from './connector_env';

export const seedSandbox = async ({
  conversationId,
  apiClient,
  request,
  getConnectors,
  logger,
}: {
  conversationId: string;
  apiClient: SandboxApiClient;
  request: KibanaRequest;
  getConnectors: ConnectorSource;
  logger: Logger;
}): Promise<void> => {
  const connectors = await getConnectors(request);

  if (connectors.length === 0) {
    logger.debug('No connectors available; skipping sandbox seeding');
    return;
  }

  const { env, markdown } = renderConnectorFiles(connectors);

  await apiClient.writeFiles(conversationId, [
    { path: '/workspace/.env', content: Buffer.from(env, 'utf8') },
    { path: '/workspace/connectors.md', content: Buffer.from(markdown, 'utf8') },
  ]);

  logger.info(`Sandbox seeded with ${connectors.length} connector(s)`);
};
