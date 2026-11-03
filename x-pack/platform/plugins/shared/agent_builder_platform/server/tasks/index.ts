/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreTasksSetup, PluginInitializerContext, TasksPlugin } from '@kbn/core/server';
import type { ActionsTasksStart } from '@kbn/actions-plugin/server/tasks';
import type { CloudTasksSetup } from '@kbn/cloud-plugin/server/tasks';
import type { LlmTasksTasksStart } from '@kbn/llm-tasks-plugin/server/tasks';
import type { AgentBuilderTasksStart } from '@kbn/agent-builder-plugin/server/tasks';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { registerAgentBuilderPlatform } from '../register_agent_builder';
import type { PlatformCoreSetup } from '../start_types';

interface TasksSetupDeps {
  agentBuilder: AgentBuilderPluginSetup;
  cloud?: CloudTasksSetup;
}

interface TasksStartDeps {
  agentBuilder: AgentBuilderTasksStart;
  actions: ActionsTasksStart;
  llmTasks?: LlmTasksTasksStart;
}

const unsupported = (what: string, why: string) => (): Promise<never> =>
  Promise.reject(new Error(`${what} is not supported in a task pod: ${why}. Run this in Kibana.`));

/**
 * The agent builder side of the platform plugin for a task pod: the platform tools (search, ES|QL,
 * index exploration, product documentation, integration knowledge), the attachment types, the
 * conversation templates and events and the skills, registered by the same function the `server`
 * entry uses.
 *
 * Differences in a pod: the cloud organization id comes from the pod's `xpack.cloud` config when
 * present (otherwise ES|QL generation has none); the product documentation tool works when the
 * `llmTasks` entry is in the family; image attachments cannot be read (the Files plugin does not run in a pod). The connector
 * search-memory type and the connector lifecycle listener belong to Kibana (the SML plugin has no
 * tasks entry), and the tracing dashboard installer is a Kibana start contract.
 */
class AgentBuilderPlatformTasksPlugin
  implements TasksPlugin<void, void, TasksSetupDeps, TasksStartDeps>
{
  private readonly isServerless: boolean;

  constructor(private readonly context: PluginInitializerContext) {
    this.isServerless = context.env.packageInfo.buildFlavor === 'serverless';
  }

  setup(core: CoreTasksSetup<TasksStartDeps>, { agentBuilder, cloud }: TasksSetupDeps) {
    const { getStartServices } = core;
    const coreSetup: PlatformCoreSetup = {
      http: core.http,
      getStartServices: async () => {
        const [coreStart, { llmTasks }] = await getStartServices();
        return [coreStart, { llmTasks }, undefined];
      },
    };

    registerAgentBuilderPlatform({
      agentBuilder,
      coreSetup,
      organizationId: cloud?.organizationId,
      isServerless: this.isServerless,
      logger: this.context.logger.get(),
      getFilesPlugin: unsupported(
        'Reading an image attachment',
        'the Files plugin does not run in a task pod'
      ),
      getAgentsStart: async () => (await getStartServices())[1].agentBuilder.agents,
      getActionsStart: async () => (await getStartServices())[1].actions,
    });
  }

  start() {}
}

export const plugin = async (context: PluginInitializerContext) =>
  new AgentBuilderPlatformTasksPlugin(context);
