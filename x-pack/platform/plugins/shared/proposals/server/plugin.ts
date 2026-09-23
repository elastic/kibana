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
import { PROPOSALS_MANAGED_WORKFLOW_OWNER_ID } from './constants';
import { registerFeatures } from './features';
import { initializeManagedWorkflows } from './managed_workflows/initialize_managed_workflows';
import { registerRoutes } from './routes/register_routes';
import { ProposalsService } from './services/proposals_service';
import { createProposalPrivilegesChecker } from './services/check_proposal_privileges';
import type { ProposalPrivilegesChecker } from './services/check_proposal_privileges';
import { createProposalUserResolver } from './services/resolve_proposal_user';
import type { ResolveProposalUser } from './services/resolve_proposal_user';
import { registerProposalAttachment } from './attachments';
import { registerStepDefinitions } from './step_types';
import { createProposalsStorageClient } from './storage/proposals_storage';
import type {
  ProposalsPluginSetup,
  ProposalsPluginStart,
  ProposalsSetupDependencies,
  ProposalsStartDependencies,
} from './types';

export class ProposalsPlugin
  implements
    Plugin<
      ProposalsPluginSetup,
      ProposalsPluginStart,
      ProposalsSetupDependencies,
      ProposalsStartDependencies
    >
{
  private readonly logger: Logger;
  private workflowsManagementApi?: WorkflowsServerPluginSetup['management'];
  // `workflowsManagement` is a required plugin, so this is set in setup() and
  // read only from start() onwards; the getter asserts that ordering.
  private proposalsService?: ProposalsService;
  private proposalPrivileges?: ProposalPrivilegesChecker;
  private spaces?: ProposalsStartDependencies['spaces'];
  private resolveUser?: ResolveProposalUser;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  setup(
    coreSetup: CoreSetup<ProposalsStartDependencies>,
    { features, workflowsExtensions, workflowsManagement, agentBuilder }: ProposalsSetupDependencies
  ): ProposalsPluginSetup {
    // The workflows management API is only exposed on the setup contract.
    this.workflowsManagementApi = workflowsManagement.management;

    registerFeatures({ features });

    registerProposalAttachment(agentBuilder);

    // Declares ownership of this plugin's managed workflows. Without it the
    // startup orphan sweep treats every workflow we installed as owned by an
    // unregistered plugin and force-deletes it.
    workflowsExtensions.registerManagedWorkflowOwner(PROPOSALS_MANAGED_WORKFLOW_OWNER_ID);

    registerStepDefinitions({
      workflowsExtensions,
      getProposalsService: () => this.requireProposalsService(),
      resolveUser: (request) => this.requireUserResolver()(request),
      // Steps register during setup but only run once Kibana has started, so
      // the authorization service is resolved per call rather than captured
      // here — `security.authz` does not exist yet.
      privileges: this.getProposalPrivilegesChecker(coreSetup),
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

  start(coreStart: CoreStart, plugins: ProposalsStartDependencies): ProposalsPluginStart {
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

    void initializeManagedWorkflows({
      workflowsExtensions: plugins.workflowsExtensions,
      logger: this.logger,
    }).catch((error) => {
      this.logger.error(
        `Proposals managed workflow initialization failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    });

    return {
      getProposalsService: () => this.requireProposalsService(),
      getProposalPrivileges: () => this.requireProposalPrivileges(),
    };
  }

  private requireWorkflowsApi(): WorkflowsServerPluginSetup['management'] {
    if (!this.workflowsManagementApi) {
      throw new Error(
        'Workflows management API is not available until the proposals plugin has been set up'
      );
    }
    return this.workflowsManagementApi;
  }

  private requireProposalsService(): ProposalsService {
    if (!this.proposalsService) {
      throw new Error('Proposals service is not available until the proposals plugin has started');
    }
    return this.proposalsService;
  }

  // Resolves security lazily per call, so step registration can use it during setup.
  private getProposalPrivilegesChecker(
    coreSetup: CoreSetup<ProposalsStartDependencies>
  ): ProposalPrivilegesChecker {
    if (!this.proposalPrivileges) {
      this.proposalPrivileges = createProposalPrivilegesChecker({
        getSecurity: async () => (await coreSetup.getStartServices())[1].security,
        logger: this.logger,
      });
    }
    return this.proposalPrivileges;
  }

  private requireProposalPrivileges(): ProposalPrivilegesChecker {
    if (!this.proposalPrivileges) {
      throw new Error(
        'Proposal privileges checker is not available until the proposals plugin has been set up'
      );
    }
    return this.proposalPrivileges;
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
      throw new Error('User resolution is not available until the proposals plugin has started');
    }
    return this.resolveUser;
  }

  stop() {}
}
