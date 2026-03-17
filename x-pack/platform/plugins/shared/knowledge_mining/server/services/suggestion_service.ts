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
import { createSuggestionStorage } from '../storage';
import type { MemoryServiceImpl } from './memory_service';
import { getCurrentSpaceId } from '../utils/spaces';
import type { SuggestionClient } from './suggestion_client';
import { SuggestionClientImpl } from './suggestion_client';

export type { SuggestionClient };

interface SuggestionServiceDeps {
  logger: Logger;
  elasticsearch: ElasticsearchServiceStart;
  security: SecurityServiceStart;
  spaces?: SpacesPluginStart;
  memoryService: MemoryServiceImpl;
}

export interface SuggestionService {
  getScopedClient(options: { request: KibanaRequest }): SuggestionClient;
}

export class SuggestionServiceImpl implements SuggestionService {
  private readonly logger: Logger;
  private readonly elasticsearch: ElasticsearchServiceStart;
  private readonly security: SecurityServiceStart;
  private readonly spaces?: SpacesPluginStart;
  private readonly memoryService: MemoryServiceImpl;

  constructor({ logger, elasticsearch, security, spaces, memoryService }: SuggestionServiceDeps) {
    this.logger = logger;
    this.elasticsearch = elasticsearch;
    this.security = security;
    this.spaces = spaces;
    this.memoryService = memoryService;
  }

  getScopedClient({ request }: { request: KibanaRequest }): SuggestionClient {
    const scopedClient = this.elasticsearch.client.asScoped(request);
    const esClient = scopedClient.asInternalUser;
    const space = getCurrentSpaceId({ request, spaces: this.spaces });
    const user = this.security.authc.getCurrentUser(request);
    const username = user?.username ?? 'unknown';
    const storage = createSuggestionStorage({ logger: this.logger, esClient });
    const memoryClient = this.memoryService.getScopedClient({ request });

    return new SuggestionClientImpl({
      storage,
      space,
      username,
      logger: this.logger,
      memoryClient,
    });
  }
}
