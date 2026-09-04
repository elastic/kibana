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
import type { ConversationRoundAuthor, CurrentUser } from '@kbn/agent-builder-common';
import type { ExecutionConversationOrigin } from '@kbn/agent-builder-server/execution';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { getUserFromRequest } from '../utils';
import { getCurrentSpaceId } from '../../utils/spaces';
import type { AgentsServiceStart } from '../agents';
import type { ConversationClient } from './client';
import { createClient } from './client';
import type { ConversationEventBus } from '../../workflows/triggers/conversation_event_bus';

export interface ConversationService {
  getScopedClient(options: { request: KibanaRequest }): Promise<ConversationClient>;
  getConversationRoundAuthor(options: {
    request: KibanaRequest;
    origin?: ExecutionConversationOrigin;
  }): Promise<ConversationRoundAuthor | undefined>;
}

interface ConversationServiceDeps {
  logger: Logger;
  security: SecurityServiceStart;
  elasticsearch: ElasticsearchServiceStart;
  spaces?: SpacesPluginStart;
  agents: AgentsServiceStart;
  eventBus?: ConversationEventBus;
}

export class ConversationServiceImpl implements ConversationService {
  private readonly logger: Logger;
  private readonly security: SecurityServiceStart;
  private readonly elasticsearch: ElasticsearchServiceStart;
  private readonly spaces?: SpacesPluginStart;
  private readonly agents: AgentsServiceStart;
  private readonly eventBus?: ConversationEventBus;

  constructor({
    logger,
    security,
    elasticsearch,
    spaces,
    agents,
    eventBus,
  }: ConversationServiceDeps) {
    this.logger = logger;
    this.security = security;
    this.elasticsearch = elasticsearch;
    this.spaces = spaces;
    this.agents = agents;
    this.eventBus = eventBus;
  }

  async getScopedClient({ request }: { request: KibanaRequest }): Promise<ConversationClient> {
    const user = await this.getCurrentUser({ request });
    const esClient = this.getScopedEsClient(request).asInternalUser;
    const space = getCurrentSpaceId({ request, spaces: this.spaces });
    const agentRegistry = await this.agents.getRegistry({ request });
    const eventBus = this.eventBus;

    return createClient({
      user,
      esClient,
      logger: this.logger,
      space,
      agentRegistry,
      onMetadataPatched: eventBus
        ? (payload) => eventBus.emitMetadataPatched(request, payload)
        : undefined,
    });
  }

  /**
   * Returns the author of a conversation round: the origin's own author if it provides one,
   * otherwise the authenticated Kibana user's profile id. Every round is attributed, whatever the
   * conversation's access mode, since authorship cannot be reconstructed once a conversation is
   * shared. No author is assigned when the user has no profile id (e.g. some API key callers) —
   * the username is not a stable identifier and must not be stored as one.
   */
  async getConversationRoundAuthor({
    request,
    origin,
  }: {
    request: KibanaRequest;
    origin?: ExecutionConversationOrigin;
  }): Promise<ConversationRoundAuthor | undefined> {
    if (origin?.author) {
      return origin.author;
    }

    const user = await this.getCurrentUser({ request });

    if (user.id === undefined) {
      return undefined;
    }

    return { id: user.id, username: user.username };
  }

  private async getCurrentUser({ request }: { request: KibanaRequest }): Promise<CurrentUser> {
    return getUserFromRequest({
      request,
      security: this.security,
      esClient: this.getScopedEsClient(request).asCurrentUser,
    });
  }

  private getScopedEsClient(request: KibanaRequest) {
    return this.elasticsearch.client.asScoped(request);
  }
}
