/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import type {
  ContextEnginePluginSetup,
  ContextEnginePluginStart,
  ContextEngineSetupDependencies,
  ContextEngineStartDependencies,
} from './types';
import { registerFeatures } from './features';
import { registerUISettings } from './ui_settings';
import { registerSearchRoute } from './routes/search';
import { registerGetRoute } from './routes/get';
import { registerListRoute } from './routes/list';
import { registerUpsertRoute } from './routes/upsert';
import { registerDeleteRoute } from './routes/delete';
import { registerAutocompleteRoute } from './routes/autocomplete';
import {
  createContextEngineService,
  type ContextEngineServiceInstance,
} from './services/engine/service';
import {
  registerContextEngineCrawlerTaskDefinition,
  scheduleContextEngineCrawlerTasks,
} from './services/engine/task_definitions';
import { resolveAttachItems } from './services/engine/execute_attach_items';
import type { ContextEngineService } from './services/engine/types';
import { registerContextEngineWorkflowSteps } from './workflow_steps';
import { corpusEntryType } from './context_engine_types/corpus_entry';
import { buildIndexAttachment, buildDeleteAttachment } from './start_contract';

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
  private contextEngineServiceInstance: ContextEngineServiceInstance;
  private contextEngineService?: ContextEngineService;
  private startContract?: ContextEnginePluginStart;
  private spaces?: ContextEngineStartDependencies['spaces'];
  private security?: ContextEngineStartDependencies['security'];
  private coreStart?: CoreStart;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
    this.contextEngineServiceInstance = createContextEngineService();
  }

  setup(
    coreSetup: CoreSetup<ContextEngineStartDependencies, ContextEnginePluginStart>,
    setupDeps: ContextEngineSetupDependencies
  ): ContextEnginePluginSetup {
    registerFeatures({ features: setupDeps.features });
    registerUISettings({ uiSettings: coreSetup.uiSettings });

    const contextEngineSetup = this.contextEngineServiceInstance.setup({
      logger: this.logger.get('contextEngine'),
    });

    // Register the neutral 'corpus_entry' Context Engine type so workflow authors can sink
    // ad-hoc / eval documents via contextEngine.addEntry without reusing a
    // solution-owned type.
    contextEngineSetup.registerType(corpusEntryType);

    registerContextEngineCrawlerTaskDefinition({
      taskManager: setupDeps.taskManager,
      getCrawlerDeps: async () => {
        const [coreStart] = await coreSetup.getStartServices();
        if (!this.contextEngineService) {
          throw new Error('getCrawlerDeps called before service start');
        }
        return {
          contextEngineService: this.contextEngineService,
          elasticsearch: coreStart.elasticsearch,
          savedObjects: coreStart.savedObjects,
          uiSettings: coreStart.uiSettings,
          logger: this.logger.get('contextEngine'),
        };
      },
    });

    const getContextEngineService = (): ContextEngineService => {
      if (!this.contextEngineService) {
        throw new Error('Context Engine service not available — plugin has not started');
      }
      return this.contextEngineService;
    };

    const router = coreSetup.http.createRouter();
    registerSearchRoute({
      router,
      coreSetup,
      logger: this.logger,
      getContextEngineService,
    });
    registerGetRoute({ router, coreSetup, logger: this.logger, getContextEngineService });
    registerListRoute({ router, coreSetup, logger: this.logger, getContextEngineService });
    registerUpsertRoute({ router, coreSetup, logger: this.logger, getContextEngineService });
    registerDeleteRoute({ router, coreSetup, logger: this.logger, getContextEngineService });
    registerAutocompleteRoute({
      router,
      coreSetup,
      logger: this.logger,
      getContextEngineService,
    });

    if (setupDeps.workflowsExtensions) {
      registerContextEngineWorkflowSteps({
        workflowsExtensions: setupDeps.workflowsExtensions,
        getStartContract: () => {
          if (!this.startContract) {
            throw new Error(
              'Context Engine start contract is not available — plugin has not started'
            );
          }
          return this.startContract;
        },
        getSpaces: () => this.spaces,
        getSecurity: () => this.security,
        isFeatureEnabled: async (request) => {
          // Mirrors `withContextEngineFeatureFlag` (HTTP routes) and the per-run
          // check inside the Context Engine crawler task. Request-scoped so per-space
          // overrides of the Context Engine setting are honored.
          if (!this.coreStart) {
            throw new Error('Context Engine feature-flag check called before plugin start');
          }
          const soClient = this.coreStart.savedObjects.getScopedClient(request);
          const uiSettingsClient = this.coreStart.uiSettings.asScopedToClient(soClient);
          return uiSettingsClient.get<boolean>(CONTEXT_ENGINE_ENABLED_SETTING_ID);
        },
      });
    }

    return {
      registerType: contextEngineSetup.registerType,
    };
  }

  start(
    coreStart: CoreStart,
    { taskManager, spaces, security }: ContextEngineStartDependencies
  ): ContextEnginePluginStart {
    const { elasticsearch, savedObjects } = coreStart;

    this.contextEngineService = this.contextEngineServiceInstance.start({
      logger: this.logger.get('contextEngine'),
      securityAuthz: security?.authz,
    });
    this.spaces = spaces;
    this.security = security;
    this.coreStart = coreStart;

    const contextEngineService = this.contextEngineService;

    scheduleContextEngineCrawlerTasks({
      taskManager,
      contextEngineService,
      logger: this.logger.get('contextEngine'),
    }).catch((error) => {
      this.logger.error(`Failed to schedule Context Engine crawler tasks: ${error.message}`);
    });

    const startContract: ContextEnginePluginStart = {
      search: contextEngineService.search,
      getDocuments: async ({ ids, request, spaceId }) => {
        if (ids.length === 0) {
          return new Map();
        }
        const resolvedSpaceId = spaceId ?? spaces?.spacesService?.getSpaceId(request) ?? 'default';
        const esClient = elasticsearch.client.asScoped(request);

        // Authorize IDs first, then fetch only the documents the user can access.
        // Unauthorized or missing IDs are absent from the returned map — callers
        // cannot distinguish "denied" from "not found", which is intentional to
        // avoid leaking existence of documents the user is not allowed to see.
        const accessMap = await contextEngineService.checkItemsAccess({
          ids,
          spaceId: resolvedSpaceId,
          esClient,
          request,
        });
        const authorizedIds = ids.filter((id) => accessMap.get(id) === true);
        if (authorizedIds.length === 0) {
          return new Map();
        }
        return contextEngineService.getDocuments({
          ids: authorizedIds,
          spaceId: resolvedSpaceId,
          esClient,
        });
      },
      getTypeDefinition: contextEngineService.getTypeDefinition,
      resolveAttachItems: (params) =>
        resolveAttachItems({ ...params, contextEngine: contextEngineService }),
      indexAttachment: buildIndexAttachment({
        contextEngineService,
        elasticsearch,
        savedObjects,
        spaces,
        logger: this.logger.get('contextEngine'),
      }),
      deleteAttachment: buildDeleteAttachment({
        contextEngineService,
        elasticsearch,
        savedObjects,
        spaces,
        logger: this.logger.get('contextEngine'),
      }),
    };

    this.startContract = startContract;

    return startContract;
  }

  stop() {}
}
