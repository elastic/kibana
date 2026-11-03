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
import { createAgentExecutionClient } from '../execution/persistence';
import type { ConversationEventBus } from '../../workflows/triggers/conversation_event_bus';
import { createScopedConversationEventEmitter } from '../../workflows/triggers/conversation_event_bus';
import type { ConversationEventsServiceStart } from '../conversation_events';
import type { AuditLogService } from '../../audit/audit_log_service';
import type { AnalyticsService } from '../../telemetry';

export interface ConversationService {
  getScopedClient(options: { request: KibanaRequest }): Promise<ConversationClient>;
  getScopedClientAsUser(options: {
    request: KibanaRequest;
    user: CurrentUser;
    /** Service account the execution runs as; see `GetAgentOptions.runAs`. */
    runAs?: string;
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
  auditLogService: AuditLogService;
  analyticsService?: AnalyticsService;
}

export class ConversationServiceImpl implements ConversationService {
  private readonly logger: Logger;
  private readonly security: SecurityServiceStart;
  private readonly elasticsearch: ElasticsearchServiceStart;
  private readonly spaces?: SpacesPluginStart;
  private readonly agents: AgentsServiceStart;
  private readonly eventBus?: ConversationEventBus;
  private readonly conversationEvents: ConversationEventsServiceStart;
  private readonly auditLogService: AuditLogService;
  private readonly analyticsService?: AnalyticsService;

  constructor({
    logger,
    security,
    elasticsearch,
    spaces,
    agents,
    eventBus,
    conversationEvents,
    auditLogService,
    analyticsService,
  }: ConversationServiceDeps) {
    this.logger = logger;
    this.security = security;
    this.elasticsearch = elasticsearch;
    this.spaces = spaces;
    this.agents = agents;
    this.eventBus = eventBus;
    this.conversationEvents = conversationEvents;
    this.auditLogService = auditLogService;
    this.analyticsService = analyticsService;
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
    runAs,
  }: {
    request: KibanaRequest;
    user: CurrentUser;
    runAs?: string;
  }): Promise<ConversationClient> {
    return this.createScopedClient({ request, user, runAs });
  }

  private async createScopedClient({
    request,
    user,
    runAs,
  }: {
    request: KibanaRequest;
    user: CurrentUser;
    runAs?: string;
  }): Promise<ConversationClient> {
    const esClient = this.getScopedEsClient(request).asInternalUser;
    const space = getCurrentSpaceId({ request, spaces: this.spaces });
    const agentRegistry = await this.agents.getRegistry({ request });
    const eventBus = this.eventBus;
    const analyticsService = this.analyticsService;

    return createClient({
      user,
      runAs,
      esClient,
      executionClient: createAgentExecutionClient({ logger: this.logger, esClient }),
      logger: this.logger,
      space,
      agentRegistry,
      conversationEvents: this.conversationEvents,
      eventEmitter: eventBus ? createScopedConversationEventEmitter(eventBus, request) : undefined,
      onConversationCreated: (params) =>
        this.auditLogService.logConversationCreated(request, params),
      reportFieldsChange: analyticsService
        ? (params) => analyticsService.reportConversationFieldsChanged(params)
        : undefined,
    });
  }

  private getScopedEsClient(request: KibanaRequest) {
    return this.elasticsearch.client.asScoped(request);
  }
}
