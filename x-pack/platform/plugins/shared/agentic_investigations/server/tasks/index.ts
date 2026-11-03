/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreTasksSetup,
  CoreTasksStart,
  KibanaRequest,
  PluginInitializerContext,
  TasksPlugin,
} from '@kbn/core/server';
import type { AgentBuilderPluginSetup, AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { AgentBuilderTasksStart } from '@kbn/agent-builder-plugin/server/tasks';
import type { ProposalsTasksStart } from '@kbn/proposals-plugin/server/tasks';
import type { SecurityTasksStart } from '@kbn/security-plugin/server/tasks';
import type { SpacesTasksStart } from '@kbn/spaces-plugin/server/tasks';
import type { WorkflowsExtensionsTasksSetup } from '@kbn/workflows-extensions/server/tasks';
import type { AgenticInvestigationsConfig } from '../config';
import { createInvestigationsPrivilegesChecker } from '../investigations/services/check_investigations_privileges';
import { createInvestigationsServices, registerInvestigationsContributions } from '../runtime';
import type { InvestigationsServices } from '../runtime';

export { config } from '../config';

interface TasksSetupDeps {
  agentBuilder: AgentBuilderPluginSetup;
  workflowsExtensions: WorkflowsExtensionsTasksSetup;
}

interface TasksStartDeps {
  security: SecurityTasksStart;
  /** The scoped conversations and attachments clients the steps and attachments read and write with. */
  agentBuilder: AgentBuilderTasksStart &
    Pick<AgentBuilderPluginStart, 'attachments' | 'conversations'>;
  proposals?: ProposalsTasksStart;
  spaces?: SpacesTasksStart;
}

/**
 * The agent builder and workflow side of agentic investigations for a task pod: the impact, subject
 * and hypotheses attachments, the conversation events and resolver, the `set_impact` and
 * `set_hypotheses` tools and the impact, investigation and workflow execution steps, over the same
 * services the `server` entry builds. Features, routes and the services behind them (escalations,
 * assignments, entity names for pills) belong to Kibana.
 */
class AgenticInvestigationsTasksPlugin
  implements TasksPlugin<{}, {}, TasksSetupDeps, TasksStartDeps>
{
  private readonly logger;
  private readonly escalationsEnabled: boolean;
  private services?: InvestigationsServices;
  private agentBuilder?: TasksStartDeps['agentBuilder'];

  constructor(context: PluginInitializerContext<AgenticInvestigationsConfig>) {
    this.logger = context.logger.get();
    this.escalationsEnabled = context.config.get().escalations.enabled;
  }

  setup(
    core: CoreTasksSetup<TasksStartDeps>,
    { agentBuilder, workflowsExtensions }: TasksSetupDeps
  ) {
    const required = <T>(value: T | undefined): T => {
      if (!value) throw new Error('Agentic investigations is not started');
      return value;
    };

    registerInvestigationsContributions({
      agentBuilder,
      workflowsExtensions,
      logger: this.logger,
      escalationsEnabled: this.escalationsEnabled,
      privileges: createInvestigationsPrivilegesChecker({
        getSecurity: async () => (await core.getStartServices())[1].security,
        logger: this.logger,
      }),
      getImpactService: () => required(this.services).impactService,
      getSubjectsService: () => required(this.services).subjectsService,
      getHypothesesService: () => required(this.services).hypothesesService,
      getInvestigationStatusService: () => required(this.services).investigationStatusService,
      resolveUser: (request) => required(this.services).resolveUser(request),
      getAttachmentClient: async (request) =>
        this.requireAgentBuilder().attachments.getScopedClient({ request }),
      getConversationClient: async (request) =>
        this.requireAgentBuilder().conversations.getScopedClient({ request }),
    });

    return {};
  }

  start(core: CoreTasksStart, { agentBuilder, proposals, spaces }: TasksStartDeps) {
    this.agentBuilder = agentBuilder;
    this.services = createInvestigationsServices({
      core,
      esClient: core.elasticsearch.client.asInternalUser,
      logger: this.logger,
      getConversationClient: async (request) =>
        this.requireAgentBuilder().conversations.getScopedClient({ request }),
      getProposals: () => proposals,
      getSpaceId: (request: KibanaRequest) =>
        spaces?.spacesService.getSpaceId(request) ?? 'default',
    });
    return {};
  }

  // The scoped clients are not part of every Agent Builder tasks contract.
  private requireAgentBuilder() {
    const agentBuilder = this.agentBuilder;
    if (!agentBuilder?.conversations || !agentBuilder.attachments) {
      throw new Error(
        'Agent Builder conversations and attachments are not available in a task pod'
      );
    }
    return agentBuilder;
  }
}

export const plugin = async (context: PluginInitializerContext<AgenticInvestigationsConfig>) =>
  new AgenticInvestigationsTasksPlugin(context);
