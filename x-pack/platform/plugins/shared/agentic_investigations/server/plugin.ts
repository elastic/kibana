/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type CoreSetup,
  type CoreStart,
  type KibanaRequest,
  type Logger,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/server';
import type { AttachmentPublicClient, ConversationPublicClient } from '@kbn/agent-builder-server';
import { registerFeatures } from './features';
import { registerImpactAttachment } from './impact/attachments';
import { registerImpactRoutes } from './impact/routes/register_routes';
import { createImpactPrivilegesChecker } from './impact/services/check_impact_privileges';
import { createImpactClient } from './impact/services/impact_client';
import { ImpactService } from './impact/services/impact_service';
import { registerImpactStepDefinitions } from './impact/step_types';
import { createImpactStorageClient } from './impact/storage/impact_storage';
import { EscalationsService } from './escalations/services/escalations_service';
import { registerEscalationRoutes } from './escalations/routes/register_routes';
import { AssignmentsService } from './assignments/assignments_service';
import { InvestigationStatusService } from './investigations/services/investigation_status_service';
import { registerInvestigationRoutes } from './investigations/routes/register_routes';
import { createUserResolver } from './services/resolve_user';
import type { ResolveUser } from './services/resolve_user';
import type {
  AgenticInvestigationsPluginSetup,
  AgenticInvestigationsPluginStart,
  AgenticInvestigationsSetupDependencies,
  AgenticInvestigationsStartDependencies,
} from './types';

export class AgenticInvestigationsPlugin
  implements
    Plugin<
      AgenticInvestigationsPluginSetup,
      AgenticInvestigationsPluginStart,
      AgenticInvestigationsSetupDependencies,
      AgenticInvestigationsStartDependencies
    >
{
  private readonly logger: Logger;
  private impactService?: ImpactService;
  private escalationsService?: EscalationsService;
  private assignmentsService?: AssignmentsService;
  private investigationStatusService?: InvestigationStatusService;
  private spaces?: AgenticInvestigationsStartDependencies['spaces'];
  private resolveUser?: ResolveUser;
  private agentBuilder?: AgenticInvestigationsStartDependencies['agentBuilder'];

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  setup(
    coreSetup: CoreSetup<AgenticInvestigationsStartDependencies>,
    { features, workflowsExtensions, agentBuilder }: AgenticInvestigationsSetupDependencies
  ): AgenticInvestigationsPluginSetup {
    registerFeatures({ features });

    registerImpactAttachment(agentBuilder, {
      getImpactService: () => this.requireImpactService(),
      logger: this.logger,
    });

    registerImpactStepDefinitions({
      workflowsExtensions,
      getImpactService: () => this.requireImpactService(),
      resolveUser: (request) => this.requireUserResolver()(request),
      // Steps register during setup but only run once Kibana has started, so
      // the authorization service is resolved per call rather than captured
      // here — `security.authz` does not exist yet.
      privileges: createImpactPrivilegesChecker({
        getSecurity: async () => (await coreSetup.getStartServices())[1].security,
        logger: this.logger,
      }),
      getAttachmentClient: (request) => this.getAttachmentClient(request),
      getConversationClient: (request) => this.getConversationClient(request),
    });

    const router = coreSetup.http.createRouter();

    registerImpactRoutes({
      router,
      logger: this.logger,
      getImpactService: () => this.requireImpactService(),
      getSpaceId: (request) => this.getSpaceId(request),
      resolveUser: (request) => this.requireUserResolver()(request),
      getAttachmentClient: (request) => this.getAttachmentClient(request),
      getConversationClient: (request) => this.getConversationClient(request),
    });

    registerEscalationRoutes({
      router,
      logger: this.logger,
      getEscalationsService: () => this.requireEscalationsService(),
      getAssignmentsService: () => this.requireAssignmentsService(),
      getSpaceId: (request) => this.getSpaceId(request),
      getSecurity: async () => (await coreSetup.getStartServices())[1].security,
    });

    registerInvestigationRoutes({
      router,
      logger: this.logger,
      getAssignmentsService: () => this.requireAssignmentsService(),
      getInvestigationStatusService: () => this.requireInvestigationStatusService(),
    });

    return {};
  }

  start(
    coreStart: CoreStart,
    plugins: AgenticInvestigationsStartDependencies
  ): AgenticInvestigationsPluginStart {
    this.spaces = plugins.spaces;
    this.agentBuilder = plugins.agentBuilder;
    this.resolveUser = createUserResolver({
      userProfile: coreStart.userProfile,
      security: coreStart.security,
      logger: this.logger,
    });

    // Reads and writes go through the internal user; authorization is enforced
    // at the API layer.
    this.impactService = new ImpactService({
      storage: createImpactStorageClient({
        esClient: coreStart.elasticsearch.client.asInternalUser,
        logger: this.logger,
      }),
    });

    this.investigationStatusService = new InvestigationStatusService({
      getConversationClient: (request) =>
        plugins.agentBuilder.conversations.getScopedClient({ request }),
      getProposals: () => plugins.proposals,
      getSpaceId: (request) => this.getSpaceId(request),
      logger: this.logger,
    });

    this.escalationsService = new EscalationsService({
      logger: this.logger,
      getConversationClient: (request) =>
        plugins.agentBuilder.conversations.getScopedClient({ request }),
      conversationTemplates: plugins.agentBuilder.conversationTemplates,
      getInvestigationStatusService: () => this.requireInvestigationStatusService(),
    });

    this.assignmentsService = new AssignmentsService({
      getConversationClient: (request) =>
        plugins.agentBuilder.conversations.getScopedClient({ request }),
    });

    const getImpactClient = createImpactClient({
      getImpactService: () => this.requireImpactService(),
      getSpaceId: (request) => this.getSpaceId(request),
      privileges: createImpactPrivilegesChecker({
        getSecurity: async () => plugins.security,
        logger: this.logger,
      }),
    });

    return {
      getImpactClient,
      getEscalationsService: () => this.requireEscalationsService(),
    };
  }

  private requireImpactService(): ImpactService {
    if (!this.impactService) {
      throw new Error(
        'Impact service is not available until the agenticInvestigations plugin has started'
      );
    }
    return this.impactService;
  }

  private requireEscalationsService(): EscalationsService {
    if (!this.escalationsService) {
      throw new Error(
        'Escalations service is not available until the agenticInvestigations plugin has started'
      );
    }
    return this.escalationsService;
  }

  private requireAssignmentsService(): AssignmentsService {
    if (!this.assignmentsService) {
      throw new Error(
        'Assignments service is not available until the agenticInvestigations plugin has started'
      );
    }
    return this.assignmentsService;
  }

  private requireInvestigationStatusService(): InvestigationStatusService {
    if (!this.investigationStatusService) {
      throw new Error(
        'InvestigationStatusService is not available until the agenticInvestigations plugin has started'
      );
    }
    return this.investigationStatusService;
  }

  private getSpaceId(request: KibanaRequest): string {
    return this.spaces?.spacesService.getSpaceId(request) ?? 'default';
  }

  /**
   * Agent Builder stays required because escalations and assignments are
   * conversations. Callers resolve these clients before the impact index write,
   * so a missing client fails the attach.
   */
  private requireAgentBuilder(): NonNullable<AgenticInvestigationsPlugin['agentBuilder']> {
    if (!this.agentBuilder) {
      throw new Error(
        'Agent Builder is not available until the agenticInvestigations plugin has started'
      );
    }
    return this.agentBuilder;
  }

  private async getAttachmentClient(request: KibanaRequest): Promise<AttachmentPublicClient> {
    return this.requireAgentBuilder().attachments.getScopedClient({ request });
  }

  private async getConversationClient(request: KibanaRequest): Promise<ConversationPublicClient> {
    return this.requireAgentBuilder().conversations.getScopedClient({ request });
  }

  /**
   * Server-derived so a caller can never attribute a write to someone else.
   * Built in `start()`, and only ever called from a request handler.
   */
  private requireUserResolver(): ResolveUser {
    if (!this.resolveUser) {
      throw new Error(
        'User resolution is not available until the agenticInvestigations plugin has started'
      );
    }
    return this.resolveUser;
  }

  stop() {}
}
