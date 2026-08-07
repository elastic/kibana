/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_MEMORY_FEATURE_ID, AGENT_MEMORY_PLUGIN_ID } from '@kbn/agent-memory-common';
import type {
  CoreSetup,
  CoreStart,
  ElasticsearchClient,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { Logger } from '@kbn/logging';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { AgentMemoryConfig } from './config';
import { registerFeatures } from './features';
import {
  createBackgroundActivityGateRegistry,
  type BackgroundActivityGateRegistry,
} from './lib/gate';
import { installMemoryTemplates, MemoryServiceImpl, type MemoryService } from './lib/memory';
import { createResolveCanManage } from './lib/status';
import { registerAgentMemoryInferenceFeatures } from './register_inference_features';
import { registerMemoryRoutes } from './routes/register_routes';
import { getUserFromRequest } from './tools/get_user_from_request';
import { registerMemorySkills } from './skills';
import { createMemoryToolAvailability, registerMemoryTools } from './tools/register_tools';
import { installMemoryWorkflows } from './workflows/install_managed_workflows';
import {
  createMemoryWorkflowsService,
  type MemoryWorkflowsService,
} from './workflows/workflows_service';
import type {
  AgentMemoryPluginSetup,
  AgentMemoryPluginStart,
  AgentMemorySetupDependencies,
  AgentMemoryStartDependencies,
} from './types';
import { registerUiSettings } from './ui_settings';

export class AgentMemoryPlugin
  implements
    Plugin<
      AgentMemoryPluginSetup,
      AgentMemoryPluginStart,
      AgentMemorySetupDependencies,
      AgentMemoryStartDependencies
    >
{
  private readonly logger: Logger;
  private readonly config: AgentMemoryConfig;
  private readonly backgroundActivityGates: BackgroundActivityGateRegistry;
  /**
   * Whether the data streams have been created in this deployment.
   *
   * Held in memory so the tool availability handler can answer without any I/O:
   * that handler runs on every tool listing and is raced against a 2s timeout,
   * after which the tools silently disappear from the picker and from MCP.
   */
  private storageInstalled = false;
  /** Core's security service, available from start onwards. */
  private security?: SecurityServiceStart;
  private workflowsService?: MemoryWorkflowsService;
  /** Captured at setup: the workflows start contract does not expose `management`. */
  private workflowsManagement?: WorkflowsServerPluginSetup;
  private installStorage: () => Promise<void> = async () => {};
  private installWorkflows: () => Promise<void> = async () => {};

  constructor(context: PluginInitializerContext<AgentMemoryConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
    this.backgroundActivityGates = createBackgroundActivityGateRegistry({ logger: this.logger });
  }

  private readonly isMemoryEnabled = () => this.config.enabled;

  private readonly getMemoryService = (esClient: ElasticsearchClient): MemoryService =>
    new MemoryServiceImpl({ logger: this.logger.get('memory'), esClient });

  setup(
    core: CoreSetup<AgentMemoryStartDependencies, AgentMemoryPluginStart>,
    plugins: AgentMemorySetupDependencies
  ): AgentMemoryPluginSetup {
    // Registered unconditionally, before the enablement check. `workflows_management`
    // snapshots the set of registered owners at setup and force-deletes managed
    // workflow documents whose owner is missing from it — so skipping this when
    // memory is disabled would delete this plugin's workflows on the next boot.
    plugins.workflowsExtensions?.registerManagedWorkflowOwner(AGENT_MEMORY_PLUGIN_ID);
    this.workflowsManagement = plugins.workflowsManagement;

    if (!this.isMemoryEnabled()) {
      this.logger.debug(
        'Agent memory is disabled (xpack.agentMemory.enabled); skipping registration.'
      );
      return {
        isMemoryEnabled: this.isMemoryEnabled,
        registerBackgroundActivityGate: this.backgroundActivityGates.register,
      };
    }

    registerFeatures({ features: plugins.features });
    registerUiSettings({ uiSettings: core.uiSettings });
    registerAgentMemoryInferenceFeatures(
      plugins.searchInferenceEndpoints,
      this.logger.get('inference-features')
    );

    registerMemoryTools({
      agentBuilder: plugins.agentBuilder,
      availability: createMemoryToolAvailability({
        isMemoryEnabled: this.isMemoryEnabled,
        isStorageInstalled: () => this.storageInstalled,
      }),
      toolOptions: {
        getMemoryService: this.getMemoryService,
        getSecurity: () => this.security,
      },
    });

    registerMemorySkills({ agentBuilder: plugins.agentBuilder });

    registerMemoryRoutes({
      router: core.http.createRouter(),
      logger: this.logger.get('routes'),
      isMemoryEnabled: this.isMemoryEnabled,
      isStorageInstalled: () => this.storageInstalled,
      getMemoryService: this.getMemoryService,
      getUser: async (request, esClient) =>
        (await getUserFromRequest({ request, security: this.security, esClient })).username,
      getWorkflowsService: () => {
        if (!this.workflowsService) {
          throw new Error('Agent memory workflows service is not available before start');
        }
        return this.workflowsService;
      },
      backgroundActivityGates: this.backgroundActivityGates,
      installStorage: () => this.installStorage(),
      installWorkflows: () => this.installWorkflows(),
      resolveCanManage: createResolveCanManage(async (request) => {
        const [coreStart] = await core.getStartServices();
        return coreStart.capabilities.resolveCapabilities(request, {
          capabilityPath: `${AGENT_MEMORY_FEATURE_ID}.*`,
        });
      }),
    });

    return {
      isMemoryEnabled: this.isMemoryEnabled,
      registerBackgroundActivityGate: this.backgroundActivityGates.register,
    };
  }

  start(core: CoreStart, plugins: AgentMemoryStartDependencies): AgentMemoryPluginStart {
    this.security = core.security;
    this.workflowsService = createMemoryWorkflowsService({
      workflowsManagement: this.workflowsManagement,
      spaces: plugins.spaces,
      logger: this.logger.get('workflows'),
    });
    this.installStorage = async () => {
      await installMemoryTemplates({
        esClient: core.elasticsearch.client.asInternalUser,
        logger: this.logger.get('install'),
      });
      this.storageInstalled = true;
    };

    if (this.isMemoryEnabled()) {
      // Templates are installed with the internal user; memory documents themselves
      // are always written as the acting user.
      this.installStorage().then(
        () => {
          this.logger.debug('Agent memory storage is ready.');
        },
        (error: Error) => {
          // Deliberately not fatal: the rest of Kibana should still start, and the
          // status endpoint reports storage as not installed so the UI can offer setup.
          this.logger.error(`Failed to install agent memory storage: ${error.message}`);
        }
      );
    }

    const { workflowsExtensions } = plugins;
    if (workflowsExtensions) {
      this.installWorkflows = async () => {
        const client = await workflowsExtensions.initManagedWorkflowsClient(AGENT_MEMORY_PLUGIN_ID);
        await installMemoryWorkflows({
          client,
          isMemoryEnabled: this.isMemoryEnabled,
          logger: this.logger.get('workflows'),
        });
      };

      // Best-effort at boot; `install` no-ops when Elasticsearch is not ready yet,
      // so the setup endpoint retries it rather than trusting this attempt.
      this.installWorkflows().catch((error: Error) => {
        this.logger.error(`Failed to install agent memory workflows: ${error.message}`);
      });
    }

    return {
      isMemoryEnabled: this.isMemoryEnabled,
      isStorageInstalled: () => this.storageInstalled,
      getMemoryService: this.getMemoryService,
    };
  }

  stop() {}
}
