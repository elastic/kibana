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
import { ConversationClient, createClient } from './client';
import { createStorage } from './storage';

export interface ConversationService {
  getScopedClient(options: { request: KibanaRequest }): Promise<ConversationClient>;
}

export class ConversationServiceImpl implements ConversationService {
  private readonly logger: Logger;
  private readonly security: SecurityServiceStart;
  private readonly elasticsearch: ElasticsearchServiceStart;

  constructor({
    logger,
    security,
    elasticsearch,
  }: {
    logger: Logger;
    security: SecurityServiceStart;
    elasticsearch: ElasticsearchServiceStart;
  }) {
    this.logger = logger;
    this.security = security;
    this.elasticsearch = elasticsearch;
  }

  async getScopedClient({ request }: { request: KibanaRequest }): Promise<ConversationClient> {
    const authUser = this.security.authc.getCurrentUser(request);
    if (!authUser) {
      throw new Error('No user bound to the provided request');
    }

    const esClient = this.elasticsearch.client.asScoped(request).asInternalUser;
    const storage = createStorage({ logger: this.logger, esClient });
    const user = { id: authUser.profile_uid!, username: authUser.username };

    return createClient({ user, storage });
  }
}
