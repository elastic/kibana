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
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { AttachmentPublicClient } from '@kbn/agent-builder-server';
import { AGENTIC_INVESTIGATIONS_MANAGED_WORKFLOW_OWNER_ID } from '../common/constants';
import { registerFeatures } from './features';
import { registerImpactRoutes } from './impact/routes/register_routes';
import { ImpactService } from './impact/services/impact_service';
import { createImpactStorageClient } from './impact/storage/impact_storage';
import { initializeManagedWorkflows } from './proposals/managed_workflows/initialize_managed_workflows';
import { registerRoutes } from './proposals/routes/register_routes';
import { ProposalsService } from './proposals/services/proposals_service';
import { createProposalPrivilegesChecker } from './proposals/services/check_proposal_privileges';
import { createProposalUserResolver } from './proposals/services/resolve_proposal_user';
import type { ResolveProposalUser } from './proposals/services/resolve_proposal_user';
import { createImpactPrivilegesChecker } from './impact/services/check_impact_privileges';
import { registerProposalAttachment } from './proposals/attachments';
import { registerImpactAttachment } from './impact/attachments';
import { registerStepDefinitions } from './proposals/step_types';
import { registerImpactStepDefinitions } from './impact/step_types';
import { createProposalsStorageClient } from './proposals/storage/proposals_storage';
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
  private workflowsManagementApi?: WorkflowsServerPluginSetup['management'];
  // `workflowsManagement` is a required plugin, so this is set in setup() and
  // read only from start() onwards; the getter asserts that ordering.
  private proposalsService?: ProposalsService;
  private impactService?: ImpactService;
  private spaces?: AgenticInvestigationsStartDependencies['spaces'];
  private resolveUser?: ResolveProposalUser;
  private agentBuilder?: AgenticInvestigationsStartDependencies['agentBuilder'];

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  setup(
    coreSetup: CoreSetup<AgenticInvestigationsStartDependencies>,
    {
      features,
      workflowsExtensions,
      workflowsManagement,
      agentBuilder,
    }: AgenticInvestigationsSetupDependencies
  ): AgenticInvestigationsPluginSetup {
    // The workflows management API is only exposed on the setup contract.
    this.workflowsManagementApi = workflowsManagement.management;

    registerFeatures({ features });

    if (agentBuilder) {
      registerProposalAttachment(agentBuilder);
      registerImpactAttachment(agentBuilder, {
        getImpactService: () => this.requireImpactService(),
        logger: this.logger,
      });
    }

    // Declares ownership of this plugin's managed workflows. Without it the
    // startup orphan sweep treats every workflow we installed as owned by an
    // unregistered plugin and force-deletes it.
    workflowsExtensions.registerManagedWorkflowOwner(
      AGENTIC_INVESTIGATIONS_MANAGED_WORKFLOW_OWNER_ID
    );

    registerStepDefinitions({
      workflowsExtensions,
      getProposalsService: () => this.requireProposalsService(),
      resolveUser: (request) => this.requireUserResolver()(request),
      // Steps register during setup but only run once Kibana has started, so
      // the authorization service is resolved per call rather than captured
      // here — `security.authz` does not exist yet.
      privileges: createProposalPrivilegesChecker({
        getSecurity: async () => (await coreSetup.getStartServices())[1].security,
        logger: this.logger,
      }),
    });

    registerImpactStepDefinitions({
      workflowsExtensions,
      getImpactService: () => this.requireImpactService(),
      resolveUser: (request) => this.requireUserResolver()(request),
      privileges: createImpactPrivilegesChecker({
        getSecurity: async () => (await coreSetup.getStartServices())[1].security,
        logger: this.logger,
      }),
      getAttachmentClient: (request) => this.getAttachmentClient(request),
    });

    const router = coreSetup.http.createRouter();

    registerRoutes({
      router,
      logger: this.logger,
      getProposalsService: () => this.requireProposalsService(),
      getSpaceId: (request) => this.getSpaceId(request),
      resolveUser: (request) => this.requireUserResolver()(request),
    });

    registerImpactRoutes({
      router,
      logger: this.logger,
      getImpactService: () => this.requireImpactService(),
      getSpaceId: (request) => this.getSpaceId(request),
      resolveUser: (request) => this.requireUserResolver()(request),
      getAttachmentClient: (request) => this.getAttachmentClient(request),
    });

    return {};
  }

  start(
    coreStart: CoreStart,
    plugins: AgenticInvestigationsStartDependencies
  ): AgenticInvestigationsPluginStart {
    this.spaces = plugins.spaces;
    this.agentBuilder = plugins.agentBuilder;
    this.resolveUser = createProposalUserResolver({
      userProfile: coreStart.userProfile,
      security: coreStart.security,
      logger: this.logger,
    });

    // Reads and writes go through the internal user; authorization is enforced
    // at the API layer.
    const storage = createProposalsStorageClient({
      esClient: coreStart.elasticsearch.client.asInternalUser,
      logger: this.logger,
    });

    this.proposalsService = new ProposalsService({
      storage,
      logger: this.logger,
      getWorkflowsApi: () => this.requireWorkflowsApi(),
    });

    this.impactService = new ImpactService({
      storage: createImpactStorageClient({
        esClient: coreStart.elasticsearch.client.asInternalUser,
        logger: this.logger,
      }),
    });

    void initializeManagedWorkflows({
      workflowsExtensions: plugins.workflowsExtensions,
      logger: this.logger,
    }).catch((error) => {
      this.logger.error(
        `Agentic investigations managed workflow initialization failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    });

    return {
      getProposalsService: () => this.requireProposalsService(),
      getImpactService: () => this.requireImpactService(),
    };
  }

  private requireWorkflowsApi(): WorkflowsServerPluginSetup['management'] {
    if (!this.workflowsManagementApi) {
      throw new Error(
        'Workflows management API is not available until the agenticInvestigations plugin has been set up'
      );
    }
    return this.workflowsManagementApi;
  }

  private requireProposalsService(): ProposalsService {
    if (!this.proposalsService) {
      throw new Error(
        'Proposals service is not available until the agenticInvestigations plugin has started'
      );
    }
    return this.proposalsService;
  }

  private requireImpactService(): ImpactService {
    if (!this.impactService) {
      throw new Error(
        'Impact service is not available until the agenticInvestigations plugin has started'
      );
    }
    return this.impactService;
  }

  private getSpaceId(request: KibanaRequest): string {
    return this.spaces?.spacesService.getSpaceId(request) ?? 'default';
  }

  private async getAttachmentClient(
    request: KibanaRequest
  ): Promise<AttachmentPublicClient | undefined> {
    if (!this.agentBuilder) {
      return undefined;
    }
    return this.agentBuilder.attachments.getScopedClient({ request });
  }

  /**
   * Server-derived so a caller can never attribute a decision to someone else.
   * Built in `start()`, and only ever called from a request handler or a step.
   */
  private requireUserResolver(): ResolveProposalUser {
    if (!this.resolveUser) {
      throw new Error(
        'User resolution is not available until the agenticInvestigations plugin has started'
      );
    }
    return this.resolveUser;
  }

  stop() {}
}
