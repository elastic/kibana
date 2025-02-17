/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import pLimit from 'p-limit';
import { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import pRetry from 'p-retry';
import { KnowledgeBaseEntry } from '../../../common';
import { resourceNames } from '..';
import { getElserModelStatus } from '../inference_endpoint';
import { ObservabilityAIAssistantPluginStartDependencies } from '../../types';
import { ObservabilityAIAssistantConfig } from '../../config';
import { setupConversationAndKbIndexAssets } from '../setup_conversation_and_kb_index_assets';

const TASK_ID = 'obs-ai-assistant:knowledge-base-migration-task-id';
const TASK_TYPE = 'obs-ai-assistant:knowledge-base-migration';

// This task will re-index all knowledge base entries without `semantic_text` field
// to ensure the field is populated with the correct embeddings.
// After the migration we will no longer need to use the `ml.tokens` field.
export async function registerMigrateKnowledgeBaseEntriesTask({
  taskManager,
  logger,
  core,
  config,
}: {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
  config: ObservabilityAIAssistantConfig;
}) {
  const [coreStart, pluginsStart] = await core.getStartServices();

  try {
    logger.debug(`Register task "${TASK_TYPE}"`);
    taskManager.registerTaskDefinitions({
      [TASK_TYPE]: {
        title: 'Migrate AI Assistant Knowledge Base',
        description: `Migrates AI Assistant knowledge base entries`,
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
                logger.debug(
                  'Knowledge base index does not exist. Skipping semantic text migration.'
                );
                return;
              }

              // update fields and mappings
              await setupConversationAndKbIndexAssets({ logger, core });

              // run migration
              await runSemanticTextKnowledgeBaseMigration({ esClient, logger, config });
            },
          };
        },
      },
    });
  } catch (error) {
    logger.error(`Failed to register task "${TASK_TYPE}". Error: ${error}`);
  }

  try {
    logger.debug(`Scheduled task: "${TASK_TYPE}"`);
    await scheduleSemanticTextMigration(pluginsStart);
  } catch (error) {
    logger.error(`Failed to schedule task "${TASK_TYPE}". Error: ${error}`);
  }
}

export function scheduleSemanticTextMigration(
  pluginsStart: ObservabilityAIAssistantPluginStartDependencies
) {
  return pluginsStart.taskManager.ensureScheduled({
    id: TASK_ID,
    taskType: TASK_TYPE,
    scope: ['aiAssistant'],
    params: {},
    state: {},
  });
}

export async function runSemanticTextKnowledgeBaseMigration({
  esClient,
  logger,
  config,
}: {
  esClient: { asInternalUser: ElasticsearchClient };
  logger: Logger;
  config: ObservabilityAIAssistantConfig;
}) {
  logger.debug('Knowledge base migration: Running migration');

  try {
    const response = await esClient.asInternalUser.search<KnowledgeBaseEntry>({
      size: 100,
      track_total_hits: true,
      index: [resourceNames.aliases.kb],
      query: {
        bool: {
          must_not: {
            exists: {
              field: 'semantic_text',
            },
          },
        },
      },
      _source: {
        excludes: ['ml.tokens'],
      },
    });

    if (response.hits.hits.length === 0) {
      logger.debug('Knowledge base migration: No remaining entries to migrate');
      return;
    }

    logger.debug(`Knowledge base migration: Found ${response.hits.hits.length} entries to migrate`);

    await waitForModel({ esClient, logger, config });

    // Limit the number of concurrent requests to avoid overloading the cluster
    const limiter = pLimit(10);
    const promises = response.hits.hits.map((hit) => {
      return limiter(() => {
        if (!hit._source || !hit._id) {
          return;
        }

        return esClient.asInternalUser.update({
          refresh: 'wait_for',
          index: resourceNames.aliases.kb,
          id: hit._id,
          body: {
            doc: {
              ...hit._source,
              semantic_text: hit._source.text,
            },
          },
        });
      });
    });

    await Promise.all(promises);
    logger.debug(`Knowledge base migration: Migrated ${promises.length} entries`);
    await runSemanticTextKnowledgeBaseMigration({ esClient, logger, config });
  } catch (e) {
    logger.error(`Knowledge base migration failed: ${e.message}`);
  }
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
