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
import { registerFeatures } from './features';
import { registerImpactRoutes } from './impact/routes/register_routes';
import { createImpactPrivilegesChecker } from './impact/services/check_impact_privileges';
import { createImpactClient } from './impact/services/impact_client';
import { ImpactService } from './impact/services/impact_service';
import { createImpactStorageClient } from './impact/storage/impact_storage';
import { EscalationsService } from './escalations/services/escalations_service';
import { registerEscalationRoutes } from './escalations/routes/register_routes';
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
  private spaces?: AgenticInvestigationsStartDependencies['spaces'];
  private resolveUser?: ResolveUser;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  setup(
    coreSetup: CoreSetup<AgenticInvestigationsStartDependencies>,
    { features }: AgenticInvestigationsSetupDependencies
  ): AgenticInvestigationsPluginSetup {
    registerFeatures({ features });

    const router = coreSetup.http.createRouter();

    registerImpactRoutes({
      router,
      logger: this.logger,
      getImpactService: () => this.requireImpactService(),
      getSpaceId: (request) => this.getSpaceId(request),
      resolveUser: (request) => this.requireUserResolver()(request),
    });

    registerEscalationRoutes({
      router,
      logger: this.logger,
      getEscalationsService: () => this.requireEscalationsService(),
      getSpaceId: (request) => this.getSpaceId(request),
      getSecurity: async () => (await coreSetup.getStartServices())[1].security,
    });

    return {};
  }

  start(
    coreStart: CoreStart,
    plugins: AgenticInvestigationsStartDependencies
  ): AgenticInvestigationsPluginStart {
    this.spaces = plugins.spaces;
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

    this.escalationsService = new EscalationsService({
      logger: this.logger,
      getConversationClient: (request) =>
        plugins.agentBuilder.conversations.getScopedClient({ request }),
      conversationTemplates: plugins.agentBuilder.conversationTemplates,
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

  private getSpaceId(request: KibanaRequest): string {
    return this.spaces?.spacesService.getSpaceId(request) ?? 'default';
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
