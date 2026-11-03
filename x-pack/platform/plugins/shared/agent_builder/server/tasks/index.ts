/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreTasksSetup,
  CoreTasksStart,
  PluginConfigDescriptor,
  PluginInitializerContext,
  TasksPlugin,
} from '@kbn/core/server';
import type { ConversationUpdatedOptIn } from '@kbn/agent-builder-server';
import type { ActionsTasksStart } from '@kbn/actions-plugin/server/tasks';
import type { InferenceTasksStart } from '@kbn/inference-plugin/server/tasks';
import type { IsomerPluginStart } from '@kbn/isomer-plugin/server';
import type { LicensingTasksStart } from '@kbn/licensing-plugin/server/tasks';
import type {
  SearchInferenceEndpointsPluginSetup,
  SearchInferenceEndpointsPluginStart,
} from '@kbn/search-inference-endpoints/server';
import type { SpacesTasksStart } from '@kbn/spaces-plugin/server/tasks';
import type {
  TaskManagerTasksSetup,
  TaskManagerTasksStart,
} from '@kbn/task-manager-plugin/server/tasks';
import type { AgentBuilderConfig } from '../config';
import { configSchema } from '../config';
import { registerInferenceFeatures } from '../inference_features';
import { registerBuiltinSetup } from '../setup_builtins';
import { createSetupContract } from '../setup_contract';
import { ServiceManager } from '../services/create_services';
import { registerTaskDefinitions } from '../services/execution/task/task_definitions';
import type { AgentBuilderPluginSetup, AgentBuilderPluginStart } from '../types';
import { getDeploymentInfo } from '../utils/deployment_info';
import { agentBuilderBridge } from './bridge';
import { toNoopContract } from './noop_contract';

export const config: PluginConfigDescriptor<AgentBuilderConfig> = { schema: configSchema };

export type AgentBuilderTasksStart = Pick<AgentBuilderPluginStart, 'agents' | 'tools'>;

interface TasksSetupDeps {
  taskManager: TaskManagerTasksSetup;
  actions: unknown;
  searchInferenceEndpoints: SearchInferenceEndpointsPluginSetup;
  workflowsManagement?: unknown;
}

interface TasksStartDeps {
  taskManager: TaskManagerTasksStart;
  actions: ActionsTasksStart;
  inference: InferenceTasksStart;
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart;
  isomer: IsomerPluginStart;
  licensing: LicensingTasksStart;
  spaces?: SpacesTasksStart;
}

/**
 * The agent execution path of Agent Builder for task runtimes: the services it builds in Kibana (the
 * same \`ServiceManager\`), the \`agent-builder:run-agent\` task and what contributing plugins register.
 * In Kibana the plugin owns all of it and this entry hands out its contracts (see \`bridge.ts\`).
 * Runs bound to a service account stay in Kibana, and an agent that calls Kibana APIs fails with a
 * clear message, because a task pod has no route back to Kibana.
 */
class AgentBuilderTasksPlugin
  implements
    TasksPlugin<AgentBuilderPluginSetup, AgentBuilderTasksStart, TasksSetupDeps, TasksStartDeps>
{
  private readonly logger;
  private readonly config: AgentBuilderConfig;
  private readonly env: PluginInitializerContext['env'];
  private readonly serviceManager: ServiceManager;
  private readonly conversationUpdatedOptIns: ConversationUpdatedOptIn[] = [];

  constructor(context: PluginInitializerContext<AgentBuilderConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
    this.env = context.env;
    this.serviceManager = new ServiceManager(this.config);
  }

  setup(core: CoreTasksSetup, deps: TasksSetupDeps): AgentBuilderPluginSetup {
    const real = agentBuilderBridge.getSetup();
    if (real) return toNoopContract(real);

    registerInferenceFeatures({ searchInferenceEndpoints: deps.searchInferenceEndpoints as never });
    const serviceSetups = this.serviceManager.setupServices({
      logger: this.logger.get('services'),
      workflowsManagement: deps.workflowsManagement as never,
      trackingService: undefined,
      cloud: undefined,
      usageApi: undefined,
      actions: deps.actions as never,
    });

    registerBuiltinSetup({
      serviceSetups,
      getStartServices: core.getStartServices as never,
    });

    registerTaskDefinitions({
      taskManager: deps.taskManager as never,
      getStartServices: core.getStartServices as never,
      getTaskHandler: () => {
        const services = this.serviceManager.internalStart;
        if (!services) throw new Error('getTaskHandler called before service init');
        return services.taskHandler;
      },
    });

    return createSetupContract({
      serviceSetups,
      topSnippets: this.config.topSnippets,
      conversationUpdatedOptIns: this.conversationUpdatedOptIns,
    });
  }

  start(core: CoreTasksStart, deps: TasksStartDeps): AgentBuilderTasksStart {
    const real = agentBuilderBridge.getStart();
    if (real) return real;

    const services = this.serviceManager.startServices({
      logger: this.logger.get('services'),
      security: core.security,
      securityPlugin: undefined,
      elasticsearch: core.elasticsearch as never,
      // A pod has no self client, so agents cannot call Kibana APIs (see the tool's message).
      http: core.http as never,
      inference: deps.inference as never,
      spaces: deps.spaces as never,
      actions: deps.actions as never,
      uiSettings: core.uiSettings as never,
      savedObjects: core.savedObjects as never,
      featureFlags: core.featureFlags,
      dataStreams: core.dataStreams as never,
      taskManager: deps.taskManager as never,
      trackingService: undefined,
      analyticsService: undefined,
      searchInferenceEndpoints: deps.searchInferenceEndpoints,
      licensing: deps.licensing as never,
      deploymentInfo: getDeploymentInfo({
        cloud: undefined,
        packageInfo: this.env.packageInfo,
        airgapped: this.env.airgapped,
      }),
      deductiveRegister: false,
      isomer: deps.isomer as never,
    });

    const runner = services.runnerFactory.getRunner();
    return {
      agents: {
        getRegistry: ({ request }) => services.agents.getRegistry({ request }),
        ensure: services.agents.ensure,
        runAgent: runner.runAgent.bind(runner),
      },
      tools: {
        getRegistry: ({ request }) => services.tools.getRegistry({ request }),
        execute: runner.runTool.bind(runner),
      },
    };
  }
}

export const plugin = async (context: PluginInitializerContext<AgentBuilderConfig>) =>
  new AgentBuilderTasksPlugin(context);
