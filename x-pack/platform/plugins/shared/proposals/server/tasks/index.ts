/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreTasksSetup,
  CoreTasksStart,
  PluginInitializerContext,
  TasksPlugin,
} from '@kbn/core/server';
import type { AgentBuilderPluginSetup, AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { AgentBuilderTasksStart } from '@kbn/agent-builder-plugin/server/tasks';
import type { SecurityTasksStart } from '@kbn/security-plugin/server/tasks';
import type { WorkflowsExtensionsTasksSetup } from '@kbn/workflows-extensions/server/tasks';
import type { WorkflowsManagementTasksSetup } from '@kbn/workflows-management-plugin/server/tasks';
import {
  createProposalsServices,
  createProposalsStart,
  registerProposalsContributions,
} from '../runtime';
import { createProposalPrivilegesChecker } from '../services/check_proposal_privileges';
import type { ProposalPrivilegesChecker } from '../services/check_proposal_privileges';
import type { ResolveProposalUser } from '../services/resolve_proposal_user';
import type { ResolveWorkerUser } from '../services/resolve_worker_user';
import type { ProposalsService } from '../services/proposals_service';
import type { ProposalsPluginStart } from '../types';

/** What other tasks entries use of proposals in a task pod: the same contract as in Kibana. */
export type ProposalsTasksStart = ProposalsPluginStart;

interface TasksSetupDeps {
  workflowsExtensions: WorkflowsExtensionsTasksSetup;
  agentBuilder: AgentBuilderPluginSetup;
  workflowsManagement: WorkflowsManagementTasksSetup;
}

interface TasksStartDeps {
  security: SecurityTasksStart;
  /** The scoped attachments client writes a new proposal into its conversation. */
  agentBuilder: AgentBuilderTasksStart & Pick<AgentBuilderPluginStart, 'attachments'>;
}

/**
 * Proposals for a task pod: the agent builder tools, skill and attachment, the workflow steps and
 * the proposals service they use, as the `server` entry builds them. Creating a proposal through the
 * gate workflow and the operations that read or resume a workflow use the Workflows Management API
 * that its tasks entry provides (the same class as in Kibana, read-only against Elasticsearch).
 * Routes, the feature and the managed workflows belong to Kibana.
 */
class ProposalsTasksPlugin
  implements TasksPlugin<{}, ProposalsPluginStart, TasksSetupDeps, TasksStartDeps>
{
  private readonly logger;
  private privileges?: ProposalPrivilegesChecker;
  private proposalsService?: ProposalsService;
  private resolveUser?: ResolveProposalUser;
  private resolveWorkerUser?: ResolveWorkerUser;
  private getWorkflowsApi?: () => WorkflowsManagementTasksSetup['management'];

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  setup(core: CoreTasksSetup<TasksStartDeps>, deps: TasksSetupDeps) {
    const privileges = createProposalPrivilegesChecker({
      getSecurity: async () => (await core.getStartServices())[1].security,
      logger: this.logger,
    });
    this.privileges = privileges;
    const workflowsApi = deps.workflowsManagement.management;
    this.getWorkflowsApi = () => workflowsApi;

    const required = <T>(value: T | undefined): T => {
      if (!value) throw new Error('Proposals is not started');
      return value;
    };

    registerProposalsContributions({
      agentBuilder: deps.agentBuilder,
      workflowsExtensions: deps.workflowsExtensions,
      logger: this.logger,
      privileges,
      getProposalsService: () => required(this.proposalsService),
      getWorkflowsApi: this.getWorkflowsApi,
      resolveUser: (request) => required(this.resolveUser)(request),
      resolveWorkerUser: (params) => required(this.resolveWorkerUser)(params),
    });

    return {};
  }

  start(core: CoreTasksStart, deps: TasksStartDeps): ProposalsPluginStart {
    const getWorkflowsApi = this.getWorkflowsApi;
    const privileges = this.privileges;
    if (!getWorkflowsApi || !privileges) throw new Error('Proposals is not set up');

    const services = createProposalsServices({
      core,
      logger: this.logger,
      getWorkflowsApi,
      getAttachmentsClient: async (request) => {
        if (!deps.agentBuilder.attachments) {
          throw new Error('Agent Builder attachments are not available in a task pod');
        }
        return deps.agentBuilder.attachments.getScopedClient({ request });
      },
    });
    this.proposalsService = services.proposalsService;
    this.resolveUser = services.resolveUser;
    this.resolveWorkerUser = services.resolveWorkerUser;

    return createProposalsStart({
      proposalsService: services.proposalsService,
      getWorkflowsApi,
      privileges,
    });
  }
}

export const plugin = async (context: PluginInitializerContext) =>
  new ProposalsTasksPlugin(context);
