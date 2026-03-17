/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  KibanaRequest,
  Logger,
  SecurityServiceStart,
  ElasticsearchServiceStart,
} from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { createMemoryStorage } from '../storage';
import { getCurrentSpaceId } from '../utils/spaces';
import type { MemoryClient } from './memory_client';
import { MemoryClientImpl } from './memory_client';

export type { MemoryClient };

interface MemoryServiceDeps {
  logger: Logger;
  elasticsearch: ElasticsearchServiceStart;
  security: SecurityServiceStart;
  spaces?: SpacesPluginStart;
}

export interface MemoryService {
  getScopedClient(options: { request: KibanaRequest }): MemoryClient;
}

export class MemoryServiceImpl implements MemoryService {
  private readonly logger: Logger;
  private readonly elasticsearch: ElasticsearchServiceStart;
  private readonly security: SecurityServiceStart;
  private readonly spaces?: SpacesPluginStart;

  constructor({ logger, elasticsearch, security, spaces }: MemoryServiceDeps) {
    this.logger = logger;
    this.elasticsearch = elasticsearch;
    this.security = security;
    this.spaces = spaces;
  }

  getScopedClient({ request }: { request: KibanaRequest }): MemoryClient {
    const scopedClient = this.elasticsearch.client.asScoped(request);
    const esClient = scopedClient.asInternalUser;
    const space = getCurrentSpaceId({ request, spaces: this.spaces });
    const user = this.security.authc.getCurrentUser(request);
    const username = user?.username ?? 'unknown';
    const storage = createMemoryStorage({ logger: this.logger, esClient });

    return new MemoryClientImpl({ storage, space, username, logger: this.logger });
  }
}
