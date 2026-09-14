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
import { registerInvestigationAttachmentTypes } from './investigations/attachments';
import type { GetNsiClient, NsiInvestigationsClientLike } from './investigations/nsi_client';
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
  /** NSI investigations client factory; set in start() from the optional dep. */
  private nsiGetClient?: GetNsiClient;
  private spaces?: AgenticInvestigationsStartDependencies['spaces'];
  private resolveUser?: ResolveProposalUser;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
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
    // The NSI client factory is resolved lazily at request time (after start());
    // agentBuilder.attachments is setup-only.
    registerInvestigationAttachmentTypes(agentBuilder.attachments, (request, spaceId) =>
      this.requireNsiClient(request, spaceId)
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

    // Wire the NSI investigations client factory so the attachment types can
    // resolve investigation data from the nightshiftInvestigations plugin.
    // nightshiftInvestigations is an optional dep that starts AFTER this plugin
    // (it requires agenticInvestigations), so plugins.nightshiftInvestigations
    // will be undefined here — the factory captures the reference and the actual
    // plugin is available by the time resolve() is called at request time.
    if (plugins.nightshiftInvestigations) {
      const nsi = plugins.nightshiftInvestigations;
      this.nsiGetClient = (request, spaceId) => nsi.getInvestigationsClient(request, spaceId);
    }

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
      // POC: service implementation removed; nightshiftInvestigations casts
      // the return value via `as unknown as ConcreteType` — the empty object
      // satisfies InvestigationsServiceHandle structurally.
      getInvestigationsService: () => ({}),
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

  /**
   * Returns an NSI investigations client for the given request and space. Called
   * lazily at request time after all plugins have started — this is what allows
   * the factory to be registered during setup() while nightshiftInvestigations
   * starts after agenticInvestigations.
   */
  private requireNsiClient(request: KibanaRequest, spaceId: string): NsiInvestigationsClientLike {
    if (!this.nsiGetClient) {
      throw new Error(
        'nightshiftInvestigations is not available; investigation attachments cannot be resolved'
      );
    }
    return this.nsiGetClient(request, spaceId);
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
