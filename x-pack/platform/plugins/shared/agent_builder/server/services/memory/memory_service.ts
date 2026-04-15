/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchServiceStart, SecurityServiceStart } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { getCurrentSpaceId } from '../../utils/spaces';
import { getUserFromRequest } from '../utils';
import type { MemoryClient } from './client';
import { createMemoryClient, ensureMemoryIndexWithEmbeddings } from './client';

export interface MemoryService {
  getScopedClient(options: { request: KibanaRequest }): Promise<MemoryClient>;
}

interface MemoryServiceDeps {
  logger: Logger;
  security: SecurityServiceStart;
  elasticsearch: ElasticsearchServiceStart;
  spaces?: SpacesPluginStart;
}

export class MemoryServiceImpl implements MemoryService {
  private readonly logger: Logger;
  private readonly security: SecurityServiceStart;
  private readonly elasticsearch: ElasticsearchServiceStart;
  private readonly spaces?: SpacesPluginStart;

  constructor({ logger, security, elasticsearch, spaces }: MemoryServiceDeps) {
    this.logger = logger;
    this.security = security;
    this.elasticsearch = elasticsearch;
    this.spaces = spaces;
  }

  /**
   * Initialize the memory index with the dense_vector embedding mapping.
   * Called once during plugin start.
   */
  async initialize(): Promise<void> {
    const esClient = this.elasticsearch.client.asInternalUser;
    await ensureMemoryIndexWithEmbeddings({ esClient, logger: this.logger });
  }

  async getScopedClient({ request }: { request: KibanaRequest }): Promise<MemoryClient> {
    const scopedClient = this.elasticsearch.client.asScoped(request);
    const user = await getUserFromRequest({
      request,
      security: this.security,
      esClient: scopedClient.asCurrentUser,
    });
    const esClient = scopedClient.asInternalUser;
    const space = getCurrentSpaceId({ request, spaces: this.spaces });

    return createMemoryClient({
      esClient,
      space,
      userName: user.username,
      userId: user.id,
      logger: this.logger,
    });
  }
}
