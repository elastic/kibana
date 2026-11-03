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
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { AgentBuilderTasksStart } from '@kbn/agent-builder-plugin/server/tasks';
import type { EvalsPluginSetup } from '@kbn/evals-plugin/server';
import type { EvalsTasksStart } from '@kbn/evals-plugin/server/tasks';
import type { SecurityTasksStart } from '@kbn/security-plugin/server/tasks';
import type { WorkflowsManagementTasksSetup } from '@kbn/workflows-management-plugin/server/tasks';
import { registerEvalsSkills } from '../register_skills';
import type { EvalsSkillsStartDependencies } from '../types';

interface TasksSetupDeps {
  agentBuilder: AgentBuilderPluginSetup;
  evals: Pick<EvalsPluginSetup, 'enabled' | 'mode'>;
  workflowsManagement: WorkflowsManagementTasksSetup;
}

interface TasksStartDeps {
  agentBuilder: AgentBuilderTasksStart;
  evals: EvalsTasksStart;
  security: SecurityTasksStart;
}

/**
 * The evals Agent Builder skills for a task pod, registered under the same conditions as in
 * Kibana (Evals enabled in `full` mode). Their tools that save or run an experiment use the
 * Workflows Management API that its tasks entry provides (the same class as in Kibana).
 */
class EvalsSkillsTasksPlugin implements TasksPlugin<{}, {}, TasksSetupDeps, TasksStartDeps> {
  private readonly logger;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  setup(
    core: CoreTasksSetup<TasksStartDeps>,
    { agentBuilder, evals, workflowsManagement }: TasksSetupDeps
  ) {
    if (!evals.enabled || evals.mode !== 'full') return {};

    const getStartDependencies = (): Promise<EvalsSkillsStartDependencies> =>
      core.getStartServices().then(([, startDependencies]) => startDependencies);

    registerEvalsSkills({
      agentBuilder,
      workflowsApi: workflowsManagement.management,
      serverBasePath: core.http.basePath.serverBasePath,
      logger: this.logger,
      getStartDependencies,
    });

    return {};
  }

  start(_core: CoreTasksStart) {
    return {};
  }
}

export const plugin = async (context: PluginInitializerContext) =>
  new EvalsSkillsTasksPlugin(context);
