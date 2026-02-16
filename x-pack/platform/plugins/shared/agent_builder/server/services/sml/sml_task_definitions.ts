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
import type { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { Logger } from '@kbn/logging';
import type { SmlCrawler } from './sml_crawler';
import type { SmlTypeRegistry } from './sml_type_registry';

export const SML_CRAWLER_TASK_TYPE = 'agent_builder:sml_crawler';

export interface SmlCrawlerTaskParams {
  attachmentType: string;
}

export interface SmlCrawlerDepsProvider {
  crawler: SmlCrawler;
  registry: SmlTypeRegistry;
  elasticsearch: ElasticsearchServiceStart;
  savedObjects: SavedObjectsServiceStart;
  logger: Logger;
}

/**
 * Register the SML crawler task type with task manager.
 * Must be called during plugin setup.
 */
export const registerSmlCrawlerTaskDefinition = ({
  taskManager,
  getCrawlerDeps,
}: {
  taskManager: TaskManagerSetupContract;
  getCrawlerDeps: () => Promise<SmlCrawlerDepsProvider> | SmlCrawlerDepsProvider;
}) => {
  taskManager.registerTaskDefinitions({
    [SML_CRAWLER_TASK_TYPE]: {
      title: 'Agent Builder: SML Crawler',
      timeout: '10m',
      maxAttempts: 3,
      createTaskRunner: (context) => {
        const { taskInstance } = context;
        const { attachmentType } = (taskInstance.params ?? {}) as Partial<SmlCrawlerTaskParams>;

        return {
          run: async () => {
            if (!attachmentType) {
              return { state: {} };
            }

            const { crawler, registry, elasticsearch, savedObjects, logger } = await getCrawlerDeps();

            logger.info(`SML crawler task starting for type '${attachmentType}'`);

            const definition = registry.get(attachmentType);
            if (!definition) {
              logger.warn(
                `SML crawler task: type definition '${attachmentType}' not found — skipping. Registered types: [${registry
                  .list()
                  .map((t) => t.id)
                  .join(', ')}]`
              );
              return { state: {} };
            }

            const esClient = elasticsearch.client.asInternalUser;
            const soRepository = savedObjects.createInternalRepository();

            try {
              await crawler.crawl({
                definition,
                esClient,
                savedObjectsClient: soRepository,
              });
              logger.info(`SML crawler task completed for type '${attachmentType}'`);
            } catch (error) {
              logger.error(
                `SML crawler task failed for type '${attachmentType}': ${(error as Error).message}`
              );
            }

            return { state: {} };
          },
          cancel: async () => {
            // No-op: the crawler is idempotent
          },
        };
      },
    },
  });
};

/**
 * Schedule SML crawler tasks for all registered types that provide a `list` hook.
 * Should be called during plugin start.
 */
export const scheduleSmlCrawlerTasks = async ({
  taskManager,
  registry,
  logger,
}: {
  taskManager: TaskManagerStartContract;
  registry: SmlTypeRegistry;
  logger: Logger;
}) => {
  const types = registry.list();

  for (const definition of types) {
    const taskId = `${SML_CRAWLER_TASK_TYPE}:${definition.id}`;
    const interval = definition.fetchFrequency?.() ?? '10m';

    try {
      await taskManager.ensureScheduled({
        id: taskId,
        taskType: SML_CRAWLER_TASK_TYPE,
        params: { attachmentType: definition.id },
        schedule: { interval },
        scope: ['agentBuilder'],
        state: {},
      });
      logger.info(
        `SML crawler task scheduled for type '${definition.id}' with interval '${interval}'`
      );
    } catch (error) {
      logger.error(
        `Failed to schedule SML crawler task for type '${definition.id}': ${error.message}`
      );
    }
  }
};
