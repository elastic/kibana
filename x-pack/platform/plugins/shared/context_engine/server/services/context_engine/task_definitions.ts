/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { TaskPriority } from '@kbn/task-manager-plugin/server';
import type { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { Logger } from '@kbn/logging';
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import type { ContextEngineService } from './types';

/**
 * Security model:
 *
 * The Context Engine crawler runs as a Task Manager background task with internal
 * credentials (`asInternalUser` / `createInternalRepository`). This is the
 * standard Kibana pattern for background tasks that have no user context.
 *
 * The crawler indexes ALL content across ALL spaces into the Context Engine system index.
 * Access control is enforced at **query time**, not index time:
 *
 *  1. `searchCe` filters results to the requesting user's current space.
 *  2. `filterResultsByPermissions` batch-checks the user's Kibana privileges
 *     against each result's `permissions` array.
 *  3. `checkItemsAccess` (used by `sml_attach`) performs the same privilege
 *     check before allowing attachment resolution.
 *
 * When the security plugin is absent (development/testing), all results are
 * returned unfiltered, following the standard Kibana open-access convention.
 *
 * Context Engine type implementers are responsible for setting correct `permissions`
 * arrays in their `getContextEngineData` hook (see `ContextEngineTypeDefinition`).
 */
export const CONTEXT_ENGINE_CRAWLER_TASK_TYPE = 'context_engine:crawler';

export interface ContextEngineCrawlerTaskParams {
  attachmentType: string;
}

export interface ContextEngineCrawlerDepsProvider {
  contextEngineService: ContextEngineService;
  elasticsearch: ElasticsearchServiceStart;
  savedObjects: SavedObjectsServiceStart;
  uiSettings: UiSettingsServiceStart;
  logger: Logger;
}

/**
 * Register the Context Engine crawler task type with task manager.
 * Must be called during plugin setup.
 */
export const registerContextEngineCrawlerTaskDefinition = ({
  taskManager,
  getCrawlerDeps,
}: {
  taskManager: TaskManagerSetupContract;
  getCrawlerDeps: () =>
    | Promise<ContextEngineCrawlerDepsProvider>
    | ContextEngineCrawlerDepsProvider;
}) => {
  taskManager.registerTaskDefinitions({
    [CONTEXT_ENGINE_CRAWLER_TASK_TYPE]: {
      title: 'Context Engine: Crawler',
      timeout: '10m',
      maxAttempts: 3,
      priority: TaskPriority.Low,
      createTaskRunner: (context) => {
        const { taskInstance, abortController } = context;
        const { attachmentType } = (taskInstance.params ??
          {}) as Partial<ContextEngineCrawlerTaskParams>;

        return {
          run: async () => {
            if (!attachmentType) {
              return { state: {} };
            }

            const { contextEngineService, elasticsearch, savedObjects, uiSettings, logger } =
              await getCrawlerDeps();

            const soClient = savedObjects.createInternalRepository();
            const uiSettingsClient = uiSettings.asScopedToClient(soClient);
            const contextEngineEnabled = await uiSettingsClient.get<boolean>(
              CONTEXT_ENGINE_ENABLED_SETTING_ID
            );
            if (!contextEngineEnabled) {
              logger.debug(
                `Context Engine crawler: Context Engine disabled — skipping crawl for type '${attachmentType}'`
              );
              return { state: {} };
            }

            logger.debug(`Context Engine crawler task starting for type '${attachmentType}'`);

            const definition = contextEngineService.getTypeDefinition(attachmentType);
            if (!definition) {
              logger.warn(
                `Context Engine crawler task: type definition '${attachmentType}' not found — skipping. Registered types: [${contextEngineService
                  .listTypeDefinitions()
                  .map((t) => t.id)
                  .join(', ')}]`
              );
              return { state: {} };
            }

            const esClient = elasticsearch.client.asInternalUser;
            const soRepository = savedObjects.createInternalRepository();

            try {
              await contextEngineService.getCrawler().crawl({
                definition,
                esClient,
                savedObjectsClient: soRepository,
                abortSignal: abortController.signal,
              });
              logger.debug(`Context Engine crawler task completed for type '${attachmentType}'`);
            } catch (error) {
              logger.error(
                `Context Engine crawler task failed for type '${attachmentType}': ${
                  (error as Error).message
                }`
              );
            }

            return { state: {} };
          },
        };
      },
    },
  });
};

/**
 * Schedule Context Engine crawler tasks for all registered types that provide a `list` hook.
 * Should be called during plugin start.
 */
export const scheduleContextEngineCrawlerTasks = async ({
  taskManager,
  contextEngineService,
  logger,
}: {
  taskManager: TaskManagerStartContract;
  contextEngineService: ContextEngineService;
  logger: Logger;
}) => {
  const types = contextEngineService.listTypeDefinitions();

  for (const definition of types) {
    const taskId = `${CONTEXT_ENGINE_CRAWLER_TASK_TYPE}:${definition.id}`;
    const interval = definition.fetchFrequency?.() ?? '10m';

    try {
      await taskManager.ensureScheduled({
        id: taskId,
        taskType: CONTEXT_ENGINE_CRAWLER_TASK_TYPE,
        params: { attachmentType: definition.id },
        schedule: { interval },
        scope: ['contextEngine'],
        state: {},
      });
      logger.info(
        `Context Engine crawler task scheduled for type '${definition.id}' with interval '${interval}'`
      );
    } catch (error) {
      logger.error(
        `Failed to schedule Context Engine crawler task for type '${definition.id}': ${
          (error as Error).message
        }`
      );
    }
  }
};
