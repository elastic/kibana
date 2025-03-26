/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { errors as EsErrors } from '@elastic/elasticsearch';
import pLimit from 'p-limit';
import { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { CoreSetup, CoreStart, Logger } from '@kbn/core/server';
import { uniq } from 'lodash';
import pRetry from 'p-retry';
import { KnowledgeBaseEntry } from '../../../common';
import { resourceNames } from '..';
import { waitForKbModel } from '../inference_endpoint';
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
  await scheduleKbSemanticTextMigrationTask({
    taskManager: pluginsStart.taskManager,
    logger,
  });
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
        description: `This task will re-index the knowledge base and populate the semantic_text fields for all entries without it.`,
        timeout: '1h',
        maxAttempts: 5,
        createTaskRunner(context) {
          return {
            async run() {
              logger.debug(`Run task: "${TASK_TYPE}"`);
              const esClient = coreStart.elasticsearch.client;

              const hasKbIndex = await esClient.asInternalUser.indices.exists({
                index: resourceNames.writeIndexAlias.kb,
              });

              if (!hasKbIndex) {
                logger.debug('Knowledge base index does not exist. Skipping migration.');
                return;
              }

              // if (config.disableKbSemanticTextMigration) {
              //   logger.info(
              //     'Semantic text migration is disabled via config "xpack.observabilityAIAssistant.disableKbSemanticTextMigration=true". Skipping migration.'
              //   );
              //   return;
              // }

              await reIndexKnowledgeBaseAndPopulateMissingSemanticTextField({
                esClient,
                logger,
                config,
              });
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

export async function reIndexKnowledgeBaseAndPopulateMissingSemanticTextField({
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
    await reIndexKnowledgeBaseIfSemanticTextIsUnsupported({ logger, esClient });

    await pRetry(
      async () => populateMissingSemanticTextFieldRecursively({ esClient, logger, config }),
      { retries: 5, minTimeout: 10_000 }
    );

    logger.debug('Migration succeeded');
  } catch (e) {
    logger.error(`Migration failed: ${e.message}`);
  }
}

async function populateMissingSemanticTextFieldRecursively({
  esClient,
  logger,
  config,
}: {
  esClient: { asInternalUser: ElasticsearchClient };
  logger: Logger;
  config: ObservabilityAIAssistantConfig;
}) {
  logger.debug(
    'Checking for remaining entries without semantic_text field that need to be migrated'
  );

  const response = await esClient.asInternalUser.search<KnowledgeBaseEntry>({
    size: 100,
    track_total_hits: true,
    index: [resourceNames.writeIndexAlias.kb],
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
    logger.debug('No remaining entries to migrate');
    return;
  }

  await waitForKbModel({ esClient, logger, config });

  const indicesWithOutdatedEntries = uniq(response.hits.hits.map((hit) => hit._index));
  logger.debug(
    `Found ${response.hits.hits.length} entries without semantic_text field in "${indicesWithOutdatedEntries}". Updating now...`
  );

  // Limit the number of concurrent requests to avoid overloading the cluster
  const limiter = pLimit(20);
  const promises = response.hits.hits.map((hit) => {
    return limiter(() => {
      if (!hit._source || !hit._id) {
        return;
      }

      return esClient.asInternalUser.update({
        refresh: 'wait_for',
        index: resourceNames.writeIndexAlias.kb,
        id: hit._id,
        doc: {
          ...hit._source,
          semantic_text: hit._source.text ?? 'No text',
        },
      });
    });
  });

  await Promise.all(promises);
  logger.debug(`Updated ${promises.length} entries`);

  await sleep(100);
  await populateMissingSemanticTextFieldRecursively({ esClient, logger, config });
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function reIndexKnowledgeBaseIfSemanticTextIsUnsupported({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: { asInternalUser: ElasticsearchClient };
}) {
  const indexSettingsResponse = await esClient.asInternalUser.indices.getSettings({
    index: resourceNames.writeIndexAlias.kb,
  });

  const results = Object.entries(indexSettingsResponse);
  if (results.length === 0) {
    logger.debug('No knowledge base indices found. Skipping re-indexing.');
    return;
  }

  const [indexName, { settings }] = results[0];
  const createdVersion = parseInt(settings?.index?.version?.created ?? '', 10);

  // Check if the index was created before version 8.11
  const versionThreshold = 8110000; // Version 8.11.0
  if (createdVersion >= versionThreshold) {
    logger.debug(
      `Knowledge base index "${indexName}" was created in version ${createdVersion}, and does not require re-indexing. Semantic text field is already supported. Aborting`
    );
    return;
  }

  logger.info(
    `Knowledge base index was created in ${createdVersion} and must be re-indexed in order to support semantic_text field. Re-indexing now...`
  );

  return reIndexKnowledgeBase({ logger, esClient });
}

export function isSemanticTextUnsupportedError(error: Error) {
  const semanticTextUnsupportedError =
    'The [sparse_vector] field type is not supported on indices created on versions 8.0 to 8.10';

  const isSemanticTextUnspported =
    error instanceof EsErrors.ResponseError &&
    (error.message.includes(semanticTextUnsupportedError) ||
      // @ts-expect-error
      error.meta?.body?.error?.caused_by?.reason.includes(semanticTextUnsupportedError));

  return isSemanticTextUnspported;
}
