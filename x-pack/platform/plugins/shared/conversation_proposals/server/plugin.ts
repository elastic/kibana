/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_APP_CATEGORIES,
  type CoreSetup,
  type CoreStart,
  type KibanaRequest,
  type Logger,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import {
  CONVERSATION_PROPOSALS_PLUGIN_ID,
  CONVERSATION_PROPOSALS_PLUGIN_NAME,
  PROPOSALS_API_PRIVILEGE_READ,
  PROPOSALS_API_PRIVILEGE_WRITE,
} from '../common/constants';
import { initializeManagedWorkflows } from './managed_workflows/initialize_managed_workflows';
import { registerRoutes } from './routes/register_routes';
import { ProposalsService } from './services/proposals_service';
import { registerStepDefinitions } from './step_types';
import { createProposalsStorageClient } from './storage/proposals_storage';
import type {
  ConversationProposalsPluginSetup,
  ConversationProposalsPluginStart,
  ConversationProposalsSetupDependencies,
  ConversationProposalsStartDependencies,
} from './types';

export class ConversationProposalsPlugin
  implements
    Plugin<
      ConversationProposalsPluginSetup,
      ConversationProposalsPluginStart,
      ConversationProposalsSetupDependencies,
      ConversationProposalsStartDependencies
    >
{
  private readonly logger: Logger;
  private workflowsManagementApi?: WorkflowsServerPluginSetup['management'];
  private proposalsService?: ProposalsService;
  private coreStart?: CoreStart;
  private spaces?: ConversationProposalsStartDependencies['spaces'];

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  setup(
    coreSetup: CoreSetup<ConversationProposalsStartDependencies>,
    { features, workflowsExtensions, workflowsManagement }: ConversationProposalsSetupDependencies
  ): ConversationProposalsPluginSetup {
    // The workflows management API is only exposed on the setup contract.
    this.workflowsManagementApi = workflowsManagement.management;

    features.registerKibanaFeature({
      id: CONVERSATION_PROPOSALS_PLUGIN_ID,
      name: CONVERSATION_PROPOSALS_PLUGIN_NAME,
      minimumLicense: 'enterprise',
      // Sits just after Workflows (3000), whose platform it builds on, and
      // after Agent Builder (1000). The category drives placement in the Roles
      // and Spaces feature pickers; `app` stays empty because this plugin
      // contributes no navigation of its own.
      order: 3100,
      category: DEFAULT_APP_CATEGORIES.kibana,
      app: [],
      privileges: {
        all: {
          app: [],
          api: [PROPOSALS_API_PRIVILEGE_READ, PROPOSALS_API_PRIVILEGE_WRITE],
          savedObject: { all: [], read: [] },
          ui: ['show', 'decide'],
        },
        read: {
          app: [],
          api: [PROPOSALS_API_PRIVILEGE_READ],
          savedObject: { all: [], read: [] },
          ui: ['show'],
        },
      },
    });

    registerStepDefinitions({
      workflowsExtensions,
      getProposalsService: () => this.requireProposalsService(),
    });

    registerRoutes({
      router: coreSetup.http.createRouter(),
      logger: this.logger,
      getProposalsService: () => this.requireProposalsService(),
      getSpaceId: (request) => this.getSpaceId(request),
      getUsername: (request) => this.getUsername(request),
    });

    return {};
  }

  start(
    coreStart: CoreStart,
    plugins: ConversationProposalsStartDependencies
  ): ConversationProposalsPluginStart {
    this.coreStart = coreStart;
    this.spaces = plugins.spaces;

    // Reads and writes go through the internal user; authorization is enforced
    // at the API layer.
    const storage = createProposalsStorageClient({
      esClient: coreStart.elasticsearch.client.asInternalUser,
      logger: this.logger,
    });

    this.proposalsService = new ProposalsService({
      storage,
      logger: this.logger,
      getWorkflowsApi: () => this.workflowsManagementApi,
    });

    void initializeManagedWorkflows({
      workflowsExtensions: plugins.workflowsExtensions,
      logger: this.logger,
    }).catch((error) => {
      this.logger.error(
        `Conversation proposals managed workflow initialization failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    });

    return {
      getProposalsService: () => this.requireProposalsService(),
    };
  }

  private requireProposalsService(): ProposalsService {
    if (!this.proposalsService) {
      throw new Error(
        'Proposals service is not available until the conversationProposals plugin has started'
      );
    }
    return this.proposalsService;
  }

  private getSpaceId(request: KibanaRequest): string {
    return this.spaces?.spacesService.getSpaceId(request) ?? 'default';
  }

  private async getUsername(request: KibanaRequest): Promise<string | undefined> {
    // Server-derived so a caller can never attribute a decision to someone else.
    return this.coreStart?.security.authc.getCurrentUser(request)?.username;
  }

  stop() {}
}
