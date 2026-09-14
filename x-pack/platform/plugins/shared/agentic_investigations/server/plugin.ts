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
import { AGENTIC_INVESTIGATIONS_MANAGED_WORKFLOW_OWNER_ID } from '../common/constants';
import { registerFeatures } from './features';
import { initializeManagedWorkflows } from './proposals/managed_workflows/initialize_managed_workflows';
import { registerRoutes } from './proposals/routes/register_routes';
import { ProposalsService } from './proposals/services/proposals_service';
import { createProposalUserResolver } from './proposals/services/resolve_proposal_user';
import type { ResolveProposalUser } from './proposals/services/resolve_proposal_user';
import { registerStepDefinitions } from './proposals/step_types';
import { createProposalsStorageClient } from './proposals/storage/proposals_storage';
import {
  InvestigationsService,
  type InvestigationsConversationsClient,
} from './investigations/services/investigations_service';
import { createInvestigationsStorageClient } from './investigations/storage/investigations_storage';
import { registerInvestigationAttachmentTypes } from './investigations/attachments';
import { registerInvestigationRoutes } from './investigations/routes';
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
  private readonly kibanaVersion: string;
  private workflowsManagementApi?: WorkflowsServerPluginSetup['management'];
  // `workflowsManagement` is a required plugin, so this is set in setup() and
  // read only from start() onwards; the getter asserts that ordering.
  private proposalsService?: ProposalsService;
  private investigationsService?: InvestigationsService;
  private spaces?: AgenticInvestigationsStartDependencies['spaces'];
  private resolveUser?: ResolveProposalUser;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
    this.kibanaVersion = context.env.packageInfo.version;
  }

  setup(
    coreSetup: CoreSetup<AgenticInvestigationsStartDependencies>,
    {
      agentBuilder,
      features,
      workflowsExtensions,
      workflowsManagement,
    }: AgenticInvestigationsSetupDependencies
  ): AgenticInvestigationsPluginSetup {
    // The workflows management API is only exposed on the setup contract.
    this.workflowsManagementApi = workflowsManagement.management;

    registerFeatures({ features });

    // Register all four investigation attachment types with Agent Builder.
    // Service is resolved lazily at request time (after start()); agentBuilder.attachments is setup-only.
    registerInvestigationAttachmentTypes(agentBuilder.attachments, () =>
      this.requireInvestigationsService()
    );

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
    });

    registerRoutes({
      router: coreSetup.http.createRouter(),
      logger: this.logger,
      getProposalsService: () => this.requireProposalsService(),
      getSpaceId: (request) => this.getSpaceId(request),
      resolveUser: (request) => this.requireUserResolver()(request),
    });

    // Register investigation routes; service is resolved lazily after start().
    registerInvestigationRoutes({
      router: coreSetup.http.createRouter(),
      logger: this.logger,
      getInvestigationsService: () => this.requireInvestigationsService(),
      getSpaceId: (request) => this.getSpaceId(request),
    });

    return {};
  }

  start(
    coreStart: CoreStart,
    plugins: AgenticInvestigationsStartDependencies
  ): AgenticInvestigationsPluginStart {
    this.spaces = plugins.spaces;
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

    // Instantiate the shared investigations storage and service.
    const investigationsStorage = createInvestigationsStorageClient({
      esClient: coreStart.elasticsearch.client.asInternalUser,
      kibanaVersion: this.kibanaVersion,
      logger: this.logger,
    });

    const investigationsConversationsClient: InvestigationsConversationsClient = {
      patchMetadata: async (_conversationId, _metadata) => {
        // TODO: implement via a scoped conversations client when Agent Builder exposes patchMetadata
      },
      bulkGet: async (_ids) => {
        // TODO: implement via a scoped conversations client when Agent Builder exposes bulkGet
        return [];
      },
    };

    this.investigationsService = new InvestigationsService(
      investigationsStorage,
      investigationsConversationsClient
    );

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
      getInvestigationsService: () => this.requireInvestigationsService(),
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

  private requireInvestigationsService(): InvestigationsService {
    if (!this.investigationsService) {
      throw new Error(
        'Investigations service is not available until the agenticInvestigations plugin has started'
      );
    }
    return this.investigationsService;
  }

  private getSpaceId(request: KibanaRequest): string {
    return this.spaces?.spacesService.getSpaceId(request) ?? 'default';
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
