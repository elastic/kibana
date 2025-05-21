/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { CoreSetup, CoreStart, Logger } from '@kbn/core/server';
import pRetry from 'p-retry';
import { resourceNames } from '..';
import { getElserModelStatus } from '../inference_endpoint';
import { ObservabilityAIAssistantPluginStartDependencies } from '../../types';
import { ObservabilityAIAssistantConfig } from '../../config';
import { reIndexKnowledgeBase } from '../knowledge_base_service/reindex_knowledge_base';

const TASK_ID = 'obs-ai-assistant:knowledge-base-migration-task-id';
const TASK_TYPE = 'obs-ai-assistant:knowledge-base-migration';

// This task will re-index all knowledge base entries without `semantic_text` field
// to ensure the field is populated with the correct embeddings.
// After the migration we will no longer need to use the `ml.tokens` field.
export async function registerAndScheduleKbSemanticTextMigrationTask({
  taskManager,
  logger,
  core,
  config,
  indexAssetsUpdatedPromise,
}: {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
  config: ObservabilityAIAssistantConfig;
  indexAssetsUpdatedPromise: Promise<void>;
}) {
  const [coreStart, pluginsStart] = await core.getStartServices();

  // register task
  registerKbSemanticTextMigrationTask({ taskManager, logger, coreStart, config });

  // wait for index assets to be updated
  await indexAssetsUpdatedPromise;

  // schedule task
  await scheduleKbSemanticTextMigrationTask({ taskManager: pluginsStart.taskManager, logger });
}

function registerKbSemanticTextMigrationTask({
  taskManager,
  logger,
  coreStart,
  config,
}: {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  coreStart: CoreStart;
  config: ObservabilityAIAssistantConfig;
}) {
  try {
    logger.debug(`Register task "${TASK_TYPE}"`);
    taskManager.registerTaskDefinitions({
      [TASK_TYPE]: {
        title: 'Add support for semantic_text in Knowledge Base',
        description: `This task will reindex the knowledge base and populate the semantic_text fields for all entries without it.`,
        timeout: '1h',
        maxAttempts: 5,
        createTaskRunner() {
          return {
            async run() {
              logger.debug(`Run task: "${TASK_TYPE}"`);
              const esClient = coreStart.elasticsearch.client;

              const hasKbIndex = await esClient.asInternalUser.indices.exists({
                index: resourceNames.aliases.kb,
              });

              if (!hasKbIndex) {
                logger.debug('Knowledge base index does not exist. Skipping migration.');
                return;
              }

              if (config.disableKbSemanticTextMigration) {
                logger.info(
                  'Semantic text migration is disabled via config "xpack.observabilityAIAssistant.disableKbSemanticTextMigration=true". Skipping migration.'
                );
                return;
              }

              await reIndexKnowledgeBaseAndPopulateSemanticTextField({ esClient, logger, config });
            },
          };
        },
      },
    });
  } catch (error) {
    logger.error(`Failed to register task "${TASK_TYPE}". Error: ${error}`);
  }
}

export async function scheduleKbSemanticTextMigrationTask({
  taskManager,
  logger,
  runSoon = false,
}: {
  taskManager: ObservabilityAIAssistantPluginStartDependencies['taskManager'];
  logger: Logger;
  runSoon?: boolean;
}) {
  logger.debug('Schedule migration task');
  await taskManager.ensureScheduled({
    id: TASK_ID,
    taskType: TASK_TYPE,
    scope: ['aiAssistant'],
    params: {},
    state: {},
  });

  if (runSoon) {
    logger.debug('Run migration task soon');
    await taskManager.runSoon(TASK_ID);
  }
}

export async function reIndexKnowledgeBaseAndPopulateSemanticTextField({
  esClient,
  logger,
  config,
}: {
  esClient: { asInternalUser: ElasticsearchClient };
  logger: Logger;
  config: ObservabilityAIAssistantConfig;
}) {
  logger.debug('Starting migration...');

  try {
    await reIndexKnowledgeBase({ logger, esClient });
    await populateSemanticTextFieldRecursively({ esClient, logger, config });
  } catch (e) {
    logger.error(`Migration failed: ${e.message}`);
  }

  logger.debug('Migration succeeded');
}

async function populateSemanticTextFieldRecursively({
  esClient,
  logger,
  config,
}: {
  esClient: { asInternalUser: ElasticsearchClient };
  logger: Logger;
  config: ObservabilityAIAssistantConfig;
}) {
  logger.debug('Initalizing semantic text migration for knowledge base entries...');

  const { count } = await esClient.asInternalUser.count({
    index: resourceNames.aliases.kb,
    query: {
      bool: {
        must_not: {
          exists: { field: 'semantic_text' },
        },
      },
    },
  });
  logger.info(`Documents missing 'semantic_text' before migration: ${count}`);

  if (count === 0) {
    logger.debug('No documents missing semantic_text field, skipping migration.');
    return;
  }

  await pRetry(
    async () => {
      await waitForModel({ esClient, logger, config });
      await esClient.asInternalUser.updateByQuery({
        index: [resourceNames.aliases.kb],
        requests_per_second: 100,
        refresh: true,
        script: {
          source: `ctx._source.semantic_text = ctx._source.text`,
          lang: 'painless',
        },
        query: {
          bool: {
            filter: { exists: { field: 'text' } },
            must_not: { exists: { field: 'semantic_text' } },
          },
        },
      });
    },
    { retries: 10, minTimeout: 10_000 }
  );
  logger.debug('Semantic text migration completed successfully.');
}

async function waitForModel({
  esClient,
  logger,
  config,
}: {
  esClient: { asInternalUser: ElasticsearchClient };
  logger: Logger;
  config: ObservabilityAIAssistantConfig;
}) {
  return pRetry(
    async () => {
      const { ready } = await getElserModelStatus({ esClient, logger, config });
      if (!ready) {
        logger.debug('Elser model is not yet ready. Retrying...');
        throw new Error('Elser model is not yet ready');
      }
    },
    { retries: 30, factor: 2, maxTimeout: 30_000 }
  );
}
