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
import { getUserFromRequest } from '../utils';
import { getCurrentSpaceId } from '../../utils/spaces';
import type { ConversationEventsClient } from './client';
import { createClient } from './client';

/**
 * Entry point to the conversation event timeline.
 */
export interface ConversationEventsService {
  /**
   * Returns a client scoped to the caller: reads and writes run as the request's user and are
   * confined to the request's space. Resolve one per request; do not cache it across requests.
   */
  getScopedClient(options: { request: KibanaRequest }): Promise<ConversationEventsClient>;
}

interface ConversationEventsServiceDeps {
  logger: Logger;
  security: SecurityServiceStart;
  elasticsearch: ElasticsearchServiceStart;
  spaces?: SpacesPluginStart;
}

/**
 * Default implementation. Constructed once at plugin start with core dependencies; each
 * `getScopedClient` call resolves the request's user and space and hands the client a
 * correspondingly scoped Elasticsearch client.
 */
export class ConversationEventsServiceImpl implements ConversationEventsService {
  private readonly logger: Logger;
  private readonly security: SecurityServiceStart;
  private readonly elasticsearch: ElasticsearchServiceStart;
  private readonly spaces?: SpacesPluginStart;

  constructor({ logger, security, elasticsearch, spaces }: ConversationEventsServiceDeps) {
    this.logger = logger;
    this.security = security;
    this.elasticsearch = elasticsearch;
    this.spaces = spaces;
  }

  async getScopedClient({
    request,
  }: {
    request: KibanaRequest;
  }): Promise<ConversationEventsClient> {
    const scopedEsClient = this.elasticsearch.client.asScoped(request);
    const user = await getUserFromRequest({
      request,
      security: this.security,
      esClient: scopedEsClient.asCurrentUser,
    });
    const space = getCurrentSpaceId({ request, spaces: this.spaces });

    return createClient({
      user,
      esClient: scopedEsClient.asInternalUser,
      logger: this.logger,
      space,
    });
  }
}
