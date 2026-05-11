/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type {
  AgentContextLayerPluginSetup,
  AgentContextLayerPluginStart,
  AgentContextLayerSetupDependencies,
  AgentContextLayerStartDependencies,
} from './types';
import { registerFeatures } from './features';
import { registerUISettings } from './ui_settings';
import { registerSearchRoute } from './routes/search';
import { registerSystemWorkflowsRoutes } from './routes/system_workflows';
import { createSmlService, type SmlServiceInstance } from './services/sml/sml_service';
import {
  registerSmlCrawlerTaskDefinition,
  scheduleSmlCrawlerTasks,
} from './services/sml/sml_task_definitions';
import { resolveSmlAttachItems } from './services/sml/execute_sml_attach_items';
import type { SmlService } from './services/sml/types';
import { registerAgentContextLayerWorkflowSteps } from './workflow_steps';
import { indexKpiSmlType } from './sml_types';

export class AgentContextLayerPlugin
  implements
    Plugin<
      AgentContextLayerPluginSetup,
      AgentContextLayerPluginStart,
      AgentContextLayerSetupDependencies,
      AgentContextLayerStartDependencies
    >
{
  private logger: Logger;
  private smlServiceInstance: SmlServiceInstance;
  private smlService?: SmlService;
  private startContract?: AgentContextLayerPluginStart;
  private spaces?: AgentContextLayerStartDependencies['spaces'];
  private workflowsManagementApi?: AgentContextLayerSetupDependencies['workflowsManagement']['management'];

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
    this.smlServiceInstance = createSmlService();
  }

  setup(
    coreSetup: CoreSetup<AgentContextLayerStartDependencies, AgentContextLayerPluginStart>,
    setupDeps: AgentContextLayerSetupDependencies
  ): AgentContextLayerPluginSetup {
    registerFeatures({ features: setupDeps.features });
    registerUISettings({ uiSettings: coreSetup.uiSettings });

    this.workflowsManagementApi = setupDeps.workflowsManagement.management;

    const smlSetup = this.smlServiceInstance.setup({ logger: this.logger.get('sml') });

    // Built-in SML types owned by this plugin. The `index_kpi` type backs the
    // bundled `workflow-sml-index-augmentation` workflow, which writes chunks
    // directly via the `agentContextLayer.smlIndexAttachment` step.
    smlSetup.registerType(indexKpiSmlType);

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
    registerSystemWorkflowsRoutes({
      router,
      coreSetup,
      logger: this.logger.get('system_workflows'),
      getWorkflowsManagementApi: () => {
        if (!this.workflowsManagementApi) {
          throw new Error(
            'Workflows management API not available — Agent Context Layer setup did not complete.'
          );
        }
        return this.workflowsManagementApi;
      },
    });

    if (setupDeps.workflowsExtensions) {
      registerAgentContextLayerWorkflowSteps({
        workflowsExtensions: setupDeps.workflowsExtensions,
        getStartContract: () => {
          if (!this.startContract) {
            throw new Error(
              'Agent Context Layer start contract is not available — plugin has not started'
            );
          }
          return this.startContract;
        },
        getSpaces: () => this.spaces,
      });
    }

    return {
      registerType: smlSetup.registerType,
    };
  }

  start(
    coreStart: CoreStart,
    { taskManager, spaces, security }: AgentContextLayerStartDependencies
  ): AgentContextLayerPluginStart {
    const { elasticsearch, savedObjects } = coreStart;

    this.smlService = this.smlServiceInstance.start({
      logger: this.logger.get('sml'),
      securityAuthz: security?.authz,
    });
    this.spaces = spaces;

    const smlService = this.smlService;

    scheduleSmlCrawlerTasks({
      taskManager,
      smlService,
      logger: this.logger.get('sml'),
    }).catch((error) => {
      this.logger.error(`Failed to schedule SML crawler tasks: ${error.message}`);
    });

    const startContract: AgentContextLayerPluginStart = {
      search: smlService.search,
      checkItemsAccess: smlService.checkItemsAccess,
      getDocuments: smlService.getDocuments,
      getTypeDefinition: smlService.getTypeDefinition,
      resolveSmlAttachItems: (params) => resolveSmlAttachItems({ ...params, sml: smlService }),
      indexAttachment: async (params) => {
        const soClient = savedObjects.getScopedClient(params.request, {
          ...(params.includedHiddenTypes?.length
            ? { includedHiddenTypes: params.includedHiddenTypes }
            : {}),
        });
        const spaceId =
          params.spaceId ?? spaces?.spacesService?.getSpaceId(params.request) ?? 'default';
        return smlService.indexAttachment({
          originId: params.originId,
          attachmentType: params.attachmentType,
          action: params.action,
          spaces: [spaceId],
          esClient: elasticsearch.client.asInternalUser,
          savedObjectsClient: soClient,
          logger: this.logger.get('sml'),
          chunks: params.chunks,
          source: params.source,
        });
      },
    };

    this.startContract = startContract;

    return startContract;
  }

  stop() {}
}
