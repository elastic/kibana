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
import { createCeService, type CeServiceInstance } from './services/ce/ce_service';
import {
  registerCeCrawlerTaskDefinition,
  scheduleCeCrawlerTasks,
} from './services/ce/ce_task_definitions';
import { resolveCeAttachItems } from './services/ce/execute_ce_attach_items';
import type { CeService } from './services/ce/types';
import { registerContextEngineWorkflowSteps } from './workflow_steps';
import { corpusEntryCeType } from './ce_types/corpus_entry';

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
  private ceServiceInstance: CeServiceInstance;
  private ceService?: CeService;
  private startContract?: ContextEnginePluginStart;
  private spaces?: ContextEngineStartDependencies['spaces'];
  private security?: ContextEngineStartDependencies['security'];
  private coreStart?: CoreStart;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
    this.ceServiceInstance = createCeService();
  }

  setup(
    coreSetup: CoreSetup<ContextEngineStartDependencies, ContextEnginePluginStart>,
    setupDeps: ContextEngineSetupDependencies
  ): ContextEnginePluginSetup {
    registerFeatures({ features: setupDeps.features });
    registerUISettings({ uiSettings: coreSetup.uiSettings });

    const ceSetup = this.ceServiceInstance.setup({ logger: this.logger.get('ce') });

    // Register the neutral 'corpus_entry' CE type so workflow authors can sink
    // ad-hoc / eval documents via contextEngine.addEntry without reusing a
    // solution-owned type.
    ceSetup.registerType(corpusEntryCeType);

    registerCeCrawlerTaskDefinition({
      taskManager: setupDeps.taskManager,
      getCrawlerDeps: async () => {
        const [coreStart] = await coreSetup.getStartServices();
        if (!this.ceService) {
          throw new Error('getCrawlerDeps called before service start');
        }
        return {
          ceService: this.ceService,
          elasticsearch: coreStart.elasticsearch,
          savedObjects: coreStart.savedObjects,
          uiSettings: coreStart.uiSettings,
          logger: this.logger.get('ce'),
        };
      },
    });

    const getCeService = (): CeService => {
      if (!this.ceService) {
        throw new Error('CE service not available — plugin has not started');
      }
      return this.ceService;
    };

    const router = coreSetup.http.createRouter();
    registerSearchRoute({
      router,
      coreSetup,
      logger: this.logger,
      getCeService,
    });
    registerGetRoute({ router, coreSetup, logger: this.logger, getCeService });
    registerListRoute({ router, coreSetup, logger: this.logger, getCeService });
    registerUpsertRoute({ router, coreSetup, logger: this.logger, getCeService });
    registerDeleteRoute({ router, coreSetup, logger: this.logger, getCeService });
    registerAutocompleteRoute({
      router,
      coreSetup,
      logger: this.logger,
      getCeService,
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
          // Mirrors `withCeFeatureFlag` (HTTP routes) and the per-run
          // check inside the CE crawler task. Request-scoped so per-space
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
      registerType: ceSetup.registerType,
    };
  }

  start(
    coreStart: CoreStart,
    { taskManager, spaces, security }: ContextEngineStartDependencies
  ): ContextEnginePluginStart {
    const { elasticsearch, savedObjects } = coreStart;

    this.ceService = this.ceServiceInstance.start({
      logger: this.logger.get('ce'),
      securityAuthz: security?.authz,
    });
    this.spaces = spaces;
    this.security = security;
    this.coreStart = coreStart;

    const ceService = this.ceService;

    scheduleCeCrawlerTasks({
      taskManager,
      ceService,
      logger: this.logger.get('ce'),
    }).catch((error) => {
      this.logger.error(`Failed to schedule CE crawler tasks: ${error.message}`);
    });

    const startContract: ContextEnginePluginStart = {
      search: ceService.search,
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
        const accessMap = await ceService.checkItemsAccess({
          ids,
          spaceId: resolvedSpaceId,
          esClient,
          request,
        });
        const authorizedIds = ids.filter((id) => accessMap.get(id) === true);
        if (authorizedIds.length === 0) {
          return new Map();
        }
        return ceService.getDocuments({
          ids: authorizedIds,
          spaceId: resolvedSpaceId,
          esClient,
        });
      },
      getTypeDefinition: ceService.getTypeDefinition,
      resolveCeAttachItems: (params) => resolveCeAttachItems({ ...params, ce: ceService }),
      indexAttachment: async (params) => {
        const soClient = savedObjects.getScopedClient(params.request, {
          ...(params.includedHiddenTypes?.length
            ? { includedHiddenTypes: params.includedHiddenTypes }
            : {}),
        });
        const spaceId =
          params.spaceId ?? spaces?.spacesService?.getSpaceId(params.request) ?? 'default';
        const base = {
          originId: params.originId,
          attachmentType: params.attachmentType,
          action: params.action,
          spaces: [spaceId],
          esClient: elasticsearch.client.asInternalUser,
          savedObjectsClient: soClient,
          logger: this.logger.get('ce'),
        };
        if (params.content !== undefined) {
          return ceService.indexAttachment({ ...base, content: params.content });
        }
        return ceService.indexAttachment({ ...base, force: params.force });
      },
      deleteAttachment: async (params) => {
        const soClient = savedObjects.getScopedClient(params.request, {
          ...(params.includedHiddenTypes?.length
            ? { includedHiddenTypes: params.includedHiddenTypes }
            : {}),
        });
        const spaceId =
          params.spaceId ?? spaces?.spacesService?.getSpaceId(params.request) ?? 'default';
        return ceService.deleteAttachment({
          originId: params.originId,
          attachmentType: params.attachmentType,
          spaces: [spaceId],
          esClient: elasticsearch.client.asInternalUser,
          savedObjectsClient: soClient,
          logger: this.logger.get('ce'),
          ...(params.ingestionMethod !== undefined
            ? { ingestionMethod: params.ingestionMethod }
            : {}),
        });
      },
    };

    this.startContract = startContract;

    return startContract;
  }

  stop() {}
}
