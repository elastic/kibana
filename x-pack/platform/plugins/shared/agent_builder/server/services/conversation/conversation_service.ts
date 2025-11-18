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
import { getCurrentSpaceId } from '../../utils/spaces';
import type { ConversationClient } from './client';
import { createClient } from './client';

export interface ConversationService {
  getScopedClient(options: { request: KibanaRequest }): Promise<ConversationClient>;
}

interface ConversationServiceDeps {
  logger: Logger;
  security: SecurityServiceStart;
  elasticsearch: ElasticsearchServiceStart;
  spaces?: SpacesPluginStart;
}

export class ConversationServiceImpl implements ConversationService {
  private readonly logger: Logger;
  private readonly security: SecurityServiceStart;
  private readonly elasticsearch: ElasticsearchServiceStart;
  private readonly spaces?: SpacesPluginStart;

  constructor({ logger, security, elasticsearch, spaces }: ConversationServiceDeps) {
    this.logger = logger;
    this.security = security;
    this.elasticsearch = elasticsearch;
    this.spaces = spaces;
  }

  async getScopedClient({ request }: { request: KibanaRequest }): Promise<ConversationClient> {
    const authUser = this.security.authc.getCurrentUser(request);
    if (!authUser) {
      throw new Error('No user bound to the provided request');
    }

    const esClient = this.elasticsearch.client.asScoped(request).asInternalUser;
    const user = { id: authUser.profile_uid!, username: authUser.username };
    const space = getCurrentSpaceId({ request, spaces: this.spaces });

    return createClient({ user, esClient, logger: this.logger, space });
  }
}
