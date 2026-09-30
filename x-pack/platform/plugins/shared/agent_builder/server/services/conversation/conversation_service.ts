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
import type { CurrentUser } from '@kbn/agent-builder-common';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { getUserFromRequest } from '../utils';
import { getCurrentSpaceId } from '../../utils/spaces';
import type { AgentsServiceStart } from '../agents';
import type { ConversationClient } from './client';
import { createClient } from './client';
import type { ConversationEventBus } from '../../workflows/triggers/conversation_event_bus';
import { createScopedConversationEventEmitter } from '../../workflows/triggers/conversation_event_bus';
import type { ConversationEventsServiceStart } from '../conversation_events';

export interface ConversationService {
  getScopedClient(options: { request: KibanaRequest }): Promise<ConversationClient>;
  getScopedClientAsUser(options: {
    request: KibanaRequest;
    user: CurrentUser;
  }): Promise<ConversationClient>;
}

interface ConversationServiceDeps {
  logger: Logger;
  security: SecurityServiceStart;
  elasticsearch: ElasticsearchServiceStart;
  spaces?: SpacesPluginStart;
  agents: AgentsServiceStart;
  eventBus?: ConversationEventBus;
  conversationEvents: ConversationEventsServiceStart;
}

export class ConversationServiceImpl implements ConversationService {
  private readonly logger: Logger;
  private readonly security: SecurityServiceStart;
  private readonly elasticsearch: ElasticsearchServiceStart;
  private readonly spaces?: SpacesPluginStart;
  private readonly agents: AgentsServiceStart;
  private readonly eventBus?: ConversationEventBus;
  private readonly conversationEvents: ConversationEventsServiceStart;

  constructor({
    logger,
    security,
    elasticsearch,
    spaces,
    agents,
    eventBus,
    conversationEvents,
  }: ConversationServiceDeps) {
    this.logger = logger;
    this.security = security;
    this.elasticsearch = elasticsearch;
    this.spaces = spaces;
    this.agents = agents;
    this.eventBus = eventBus;
    this.conversationEvents = conversationEvents;
  }

  async getScopedClient({ request }: { request: KibanaRequest }): Promise<ConversationClient> {
    const user = await getUserFromRequest({
      request,
      security: this.security,
      esClient: this.getScopedEsClient(request).asCurrentUser,
    });

    return this.createScopedClient({ request, user });
  }

  async getScopedClientAsUser({
    request,
    user,
  }: {
    request: KibanaRequest;
    user: CurrentUser;
  }): Promise<ConversationClient> {
    return this.createScopedClient({ request, user });
  }

  private async createScopedClient({
    request,
    user,
  }: {
    request: KibanaRequest;
    user: CurrentUser;
  }): Promise<ConversationClient> {
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
      conversationEvents: this.conversationEvents,
      eventEmitter: eventBus ? createScopedConversationEventEmitter(eventBus, request) : undefined,
    });
  }

  private getScopedEsClient(request: KibanaRequest) {
    return this.elasticsearch.client.asScoped(request);
  }
}
