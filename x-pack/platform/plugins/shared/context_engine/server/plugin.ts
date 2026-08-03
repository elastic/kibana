/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import type {
  ContextEnginePluginSetup,
  ContextEnginePluginStart,
  ContextEngineSetupDependencies,
  ContextEngineStartDependencies,
} from './types';
import { registerFeatures } from './features';
import { registerAiIndexRoutes } from './routes/ai_indices';
import { registerSelfImprovementRoutes } from './routes/self_improvement';
import { registerPatternRoutes } from './routes/patterns';
import { AiIndexService } from './ai_indices/service';
import { AiIndexRegistry } from './ai_indices/registry';
import { CasesService } from './cases/service';
import { PatternsService } from './patterns/service';
import { ImprovementsService } from './improvements/service';
import { registerSelfImprovementTasks } from './tasks';

const notStarted = (name: string) => () => {
  throw new Error(`${name} not available — plugin has not started`);
};

export class ContextEnginePlugin
  implements
    Plugin<
      ContextEnginePluginSetup,
      ContextEnginePluginStart,
      ContextEngineSetupDependencies,
      ContextEngineStartDependencies
    >
{
  private logger: Logger;
  private aiIndexService?: AiIndexService;
  private casesService?: CasesService;
  private patternsService?: PatternsService;
  private improvementsService?: ImprovementsService;
  private taskManagerStart?: TaskManagerStartContract;
  private readonly aiIndexRegistry = new AiIndexRegistry();

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  setup(
    coreSetup: CoreSetup<ContextEngineStartDependencies, ContextEnginePluginStart>,
    setupDeps: ContextEngineSetupDependencies
  ): ContextEnginePluginSetup {
    registerFeatures({ features: setupDeps.features });

    if (setupDeps.taskManager) {
      registerSelfImprovementTasks(setupDeps.taskManager, {
        core: coreSetup,
        logger: this.logger.get('tasks'),
        // Read lazily: the start contract (needed for runSoon) is set in start().
        getTaskManager: () => this.taskManagerStart,
      });
    }

    const router = coreSetup.http.createRouter();
    const getAiIndexService = () => this.aiIndexService ?? notStarted('AI index service')();
    const getCasesService = () => this.casesService ?? notStarted('Cases service')();
    const getPatternsService = () => this.patternsService ?? notStarted('Patterns service')();
    const getImprovementsService = () =>
      this.improvementsService ?? notStarted('Improvements service')();

    registerAiIndexRoutes({ router, getAiIndexService });
    registerSelfImprovementRoutes({
      router,
      getAiIndexService,
      getCasesService,
      getPatternsService,
      getImprovementsService,
      getTaskManager: () => this.taskManagerStart,
    });
    registerPatternRoutes({ router, getPatternsService, getCasesService, getImprovementsService });

    return {
      registerAiIndex: (id, properties) => this.aiIndexRegistry.register(id, properties),
      getAiIndexService,
      getWorkflowsApi: () => setupDeps.workflowsManagement?.management,
    };
  }

  start(
    coreStart: CoreStart,
    startDeps: ContextEngineStartDependencies
  ): ContextEnginePluginStart {
    const esClient = coreStart.elasticsearch.client.asInternalUser;

    this.aiIndexService = new AiIndexService({ esClient, logger: this.logger.get('ai_indices') });
    this.casesService = new CasesService({ esClient, logger: this.logger.get('cases') });
    this.patternsService = new PatternsService({ esClient, logger: this.logger.get('patterns') });
    this.improvementsService = new ImprovementsService({
      esClient,
      logger: this.logger.get('improvements'),
    });
    this.taskManagerStart = startDeps.taskManager;

    const aiIndexService = this.aiIndexService;
    const registry = this.aiIndexRegistry;
    const aiIndexLogger = this.logger.get('ai_indices');

    const soClient = coreStart.savedObjects.createInternalRepository();
    const uiSettings = coreStart.uiSettings.asScopedToClient(soClient);

    uiSettings
      .get<boolean>(CONTEXT_ENGINE_ENABLED_SETTING_ID)
      .then((isEnabled) =>
        registry.startupRegister({
          aiIndexService,
          isEnabled: isEnabled ?? false,
          logger: aiIndexLogger,
        })
      )
      .catch((err) => {
        aiIndexLogger.warn(
          `AI index startup registration failed: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      });

    return {};
  }

  stop() {}
}
