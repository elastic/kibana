/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import {
  createSmlService,
  registerSmlCrawlerTaskDefinition,
  scheduleSmlCrawlerTasks,
  type SmlServiceInstance,
  type SmlService,
} from './services/sml';
import type {
  SemanticLayerPluginSetup,
  SemanticLayerPluginStart,
  SemanticLayerSetupDependencies,
  SemanticLayerStartDependencies,
} from './types';
import { registerFeatures } from './features';
import { registerUISettings } from './ui_settings';
import { registerSearchRoute } from './routes/search';

export class SemanticLayerPlugin
  implements
    Plugin<
      SemanticLayerPluginSetup,
      SemanticLayerPluginStart,
      SemanticLayerSetupDependencies,
      SemanticLayerStartDependencies
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
    coreSetup: CoreSetup<SemanticLayerStartDependencies, SemanticLayerPluginStart>,
    setupDeps: SemanticLayerSetupDependencies
  ): SemanticLayerPluginSetup {
    const smlSetup = this.smlServiceInstance.setup({
      logger: this.logger.get('sml'),
    });

    registerFeatures({ features: setupDeps.features });
    registerUISettings({ uiSettings: coreSetup.uiSettings });

    registerSmlCrawlerTaskDefinition({
      taskManager: setupDeps.taskManager,
      getCrawlerDeps: async () => {
        const [coreStart] = await coreSetup.getStartServices();
        if (!this.smlService) {
          throw new Error('SML service not available — plugin has not started');
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

    const router = coreSetup.http.createRouter();
    registerSearchRoute({
      router,
      logger: this.logger,
      coreSetup,
      getSmlService: () => {
        if (!this.smlService) {
          throw new Error('SML service not available — plugin has not started');
        }
        return this.smlService;
      },
    });

    return {
      registerType: smlSetup.registerType.bind(smlSetup),
    };
  }

  start(coreStart: CoreStart, startDeps: SemanticLayerStartDependencies): SemanticLayerPluginStart {
    const { elasticsearch, savedObjects } = coreStart;

    const smlService = this.smlServiceInstance.start({
      logger: this.logger.get('sml'),
      securityAuthz: startDeps.security?.authz,
    });

    this.smlService = smlService;

    scheduleSmlCrawlerTasks({
      taskManager: startDeps.taskManager,
      smlService,
      logger: this.logger.get('sml'),
    }).catch((error) => {
      this.logger.error(`Failed to schedule SML crawler tasks: ${error.message}`);
    });

    return {
      getSmlService: () => smlService,
      indexAttachment: async (params) => {
        const soClient = savedObjects.getScopedClient(params.request);
        const spaceId = params.spaceId ?? 'default';
        return smlService.indexAttachment({
          originId: params.originId,
          attachmentType: params.attachmentType,
          action: params.action,
          spaces: [spaceId],
          esClient: elasticsearch.client.asInternalUser,
          savedObjectsClient: soClient,
          logger: this.logger.get('sml'),
        });
      },
    };
  }

  stop() {}
}
