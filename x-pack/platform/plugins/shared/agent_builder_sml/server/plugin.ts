/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { DASHBOARD_KNOWLEDGE_INDICATORS_WORKFLOW_ID } from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type {
  AgentBuilderSmlPluginSetup,
  AgentBuilderSmlPluginStart,
  AgentBuilderSmlSetupDependencies,
  AgentBuilderSmlStartDependencies,
} from './types';
import { registerFeatures } from './features';
import { registerUISettings } from './ui_settings';
import { registerSearchRoute } from './routes/search';
import { registerAutocompleteRoute } from './routes/autocomplete';
import { createSmlService, type SmlServiceInstance } from './services/sml/sml_service';
import {
  registerSmlCrawlerTaskDefinition,
  scheduleSmlCrawlerTasks,
} from './services/sml/sml_task_definitions';
import { resolveSmlAttachItems } from './services/sml/execute_sml_attach_items';
import type { SmlService } from './services/sml/types';
import { buildIndexAttachment, buildDeleteAttachment } from './start_contract';

/**
 * Owner id for the managed workflows this plugin installs. Must stay in sync
 * with the `pluginId` on the corresponding managed workflow definition:
 * workflows whose owner is not registered are treated as orphans and deleted at
 * startup.
 */
const AGENT_BUILDER_SML_MANAGED_WORKFLOW_OWNER = 'agentBuilderSml';

/**
 * Every managed workflow this plugin owns. Single source of truth: each id is
 * both installed at startup and registered as an automation on the "Elastic" AI
 * index, so adding a workflow here is enough to roll it out.
 */
const AGENT_BUILDER_SML_MANAGED_WORKFLOW_IDS = [
  DASHBOARD_KNOWLEDGE_INDICATORS_WORKFLOW_ID,
] as const;

export class AgentBuilderSmlPlugin
  implements
    Plugin<
      AgentBuilderSmlPluginSetup,
      AgentBuilderSmlPluginStart,
      AgentBuilderSmlSetupDependencies,
      AgentBuilderSmlStartDependencies
    >
{
  private logger: Logger;
  private smlServiceInstance: SmlServiceInstance;
  private smlService?: SmlService;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
    this.smlServiceInstance = createSmlService();
  }

  setup(
    coreSetup: CoreSetup<AgentBuilderSmlStartDependencies, AgentBuilderSmlPluginStart>,
    setupDeps: AgentBuilderSmlSetupDependencies
  ): AgentBuilderSmlPluginSetup {
    registerFeatures({ features: setupDeps.features });
    registerUISettings({ uiSettings: coreSetup.uiSettings });

    const smlSetup = this.smlServiceInstance.setup({ logger: this.logger.get('sml') });

    registerSmlCrawlerTaskDefinition({
      taskManager: setupDeps.taskManager,
      getCrawlerDeps: async () => {
        const [coreStart] = await coreSetup.getStartServices();
        if (!this.smlService) {
          throw new Error('getCrawlerDeps called before service start');
        }
        return {
          smlService: this.smlService,
          elasticsearch: coreStart.elasticsearch,
          savedObjects: coreStart.savedObjects,
          uiSettings: coreStart.uiSettings,
          logger: this.logger.get('sml'),
        };
      },
    });

    const getSmlService = (): SmlService => {
      if (!this.smlService) {
        throw new Error('SML service not available — plugin has not started');
      }
      return this.smlService;
    };

    const router = coreSetup.http.createRouter();
    registerSearchRoute({
      router,
      coreSetup,
      logger: this.logger,
      getSmlService,
    });
    registerAutocompleteRoute({
      router,
      coreSetup,
      logger: this.logger,
      getSmlService,
    });

    setupDeps.workflowsExtensions?.registerManagedWorkflowOwner(
      AGENT_BUILDER_SML_MANAGED_WORKFLOW_OWNER
    );

    setupDeps.contextEngine?.registerAiIndex('elastic', {
      description:
        'Kibana resources available for use in Agent Builder, including dashboards, ' +
        'visualizations, connectors, workflows, alerting rules, action policies, ' +
        'and significant events.',
      dest: { type: 'index', value: 'ai-index-idx-sml-data' },
      automations: AGENT_BUILDER_SML_MANAGED_WORKFLOW_IDS.map((value) => ({
        type: 'workflow' as const,
        value,
      })),
      sources: [],
    });

    return {
      registerType: smlSetup.registerType,
    };
  }

  start(
    coreStart: CoreStart,
    { taskManager, spaces, security, workflowsExtensions }: AgentBuilderSmlStartDependencies
  ): AgentBuilderSmlPluginStart {
    const { elasticsearch, savedObjects } = coreStart;

    void this.installManagedWorkflows(workflowsExtensions);

    this.smlService = this.smlServiceInstance.start({
      logger: this.logger.get('sml'),
      securityAuthz: security?.authz,
    });

    const smlService = this.smlService;

    scheduleSmlCrawlerTasks({
      taskManager,
      smlService,
      logger: this.logger.get('sml'),
    }).catch((error) => {
      this.logger.error(`Failed to schedule SML crawler tasks: ${error.message}`);
    });

    const startContract: AgentBuilderSmlPluginStart = {
      search: smlService.search,
      getTypeDefinition: smlService.getTypeDefinition,
      resolveSmlAttachItems: (params) => resolveSmlAttachItems({ ...params, sml: smlService }),
      indexAttachment: buildIndexAttachment({
        smlService,
        elasticsearch,
        savedObjects,
        spaces,
        logger: this.logger.get('sml'),
      }),
      deleteAttachment: buildDeleteAttachment({
        smlService,
        elasticsearch,
        savedObjects,
        spaces,
        logger: this.logger.get('sml'),
      }),
    };

    return startContract;
  }

  stop() {}

  /**
   * Installs the managed workflows registered as automations on the "Elastic"
   * AI index. Fire-and-forget so `start()` stays synchronous; a failure here
   * must not take the plugin down, since SML search and crawling do not depend
   * on the workflows being present.
   */
  private async installManagedWorkflows(
    workflowsExtensions: AgentBuilderSmlStartDependencies['workflowsExtensions']
  ): Promise<void> {
    if (!workflowsExtensions) {
      return;
    }

    try {
      const client = await workflowsExtensions.initManagedWorkflowsClient(
        AGENT_BUILDER_SML_MANAGED_WORKFLOW_OWNER
      );

      for (const workflowId of AGENT_BUILDER_SML_MANAGED_WORKFLOW_IDS) {
        await client.install(workflowId, { spaceId: GLOBAL_WORKFLOW_SPACE_ID });
      }

      // Only signalled once every install succeeded. `ready()` reconciliation
      // deletes any of this plugin's static workflows missing from the current
      // startup window, so publishing a partial install would drop the
      // already-persisted copy of whichever workflow failed.
      await client.ready();

      this.logger.debug(
        `Installed ${AGENT_BUILDER_SML_MANAGED_WORKFLOW_IDS.length} managed workflow(s) successfully`
      );
    } catch (error) {
      this.logger.warn('Failed to install managed workflows', { error });
    }
  }
}
