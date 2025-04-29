/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import pLimit from 'p-limit';
import type { CoreSetup, Logger } from '@kbn/core/server';
import { uniq } from 'lodash';
import pRetry from 'p-retry';
import { LockAcquisitionError, LockManagerService } from '@kbn/lock-manager';
import { KnowledgeBaseEntry } from '../../../common';
import { resourceNames } from '..';
import { waitForKbModel } from '../inference_endpoint';
import { ObservabilityAIAssistantPluginStartDependencies } from '../../types';
import { ObservabilityAIAssistantConfig } from '../../config';
import { reIndexKnowledgeBaseWithLock } from '../knowledge_base_service/reindex_knowledge_base';

const PLUGIN_STARTUP_LOCK_ID = 'observability_ai_assistant:startup_migrations';

// This function populates the `semantic_text` field for knowledge base entries during the plugin's startup process.
// It ensures all missing fields are updated in batches and uses a distributed lock to prevent conflicts in distributed environments.
// If the knowledge base index does not support the `semantic_text` field, it is re-indexed.
export async function populateMissingSemanticTextFieldMigration({
  core,
  logger,
  config,
}: {
  core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
  logger: Logger;
  config: ObservabilityAIAssistantConfig;
}) {
  const [coreStart] = await core.getStartServices();
  const esClient = coreStart.elasticsearch.client;

  const lmService = new LockManagerService(core, logger);
  await lmService
    .withLock(PLUGIN_STARTUP_LOCK_ID, async () => {
      const hasKbIndex = await esClient.asInternalUser.indices.exists({
        index: resourceNames.aliases.kb,
      });

      if (!hasKbIndex) {
        logger.warn('Knowledge base index does not exist. Aborting updating index assets');
        return;
      }

      const isKbSemanticTextCompatible = await isKnowledgeBaseSemanticTextCompatible({
        logger,
        esClient,
      });

      if (!isKbSemanticTextCompatible) {
        await reIndexKnowledgeBaseWithLock({ core, logger, esClient });
      }

      await pRetry(
        async () => populateMissingSemanticTextFieldRecursively({ esClient, logger, config }),
        { retries: 5, minTimeout: 10_000 }
      );
    })
    .catch((error) => {
      if (!(error instanceof LockAcquisitionError)) {
        throw error;
      }
    });
}

// Ensures that every doc has populated the `semantic_text` field.
// It retrieves entries without the field, updates them in batches, and continues until no entries remain.
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
        index: resourceNames.aliases.kb,
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

// Checks if the knowledge base index supports `semantic_text`
// If the index was created before version 8.11, it requires re-indexing to support the `semantic_text` field.
async function isKnowledgeBaseSemanticTextCompatible({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: { asInternalUser: ElasticsearchClient };
}): Promise<boolean> {
  const indexSettingsResponse = await esClient.asInternalUser.indices.getSettings({
    index: resourceNames.aliases.kb,
  });

  const results = Object.entries(indexSettingsResponse);
  if (results.length === 0) {
    logger.debug('No knowledge base indices found. Skipping re-indexing.');
    return true;
  }

  const [indexName, { settings }] = results[0];
  const createdVersion = parseInt(settings?.index?.version?.created ?? '', 10);

  // Check if the index was created before version 8.11
  const versionThreshold = 8110000; // Version 8.11.0
  if (createdVersion >= versionThreshold) {
    logger.debug(
      `Knowledge base index "${indexName}" was created in version ${createdVersion}, and does not require re-indexing. Semantic text field is already supported. Aborting`
    );
    return true;
  }

  logger.info(
    `Knowledge base index was created in ${createdVersion} and must be re-indexed in order to support semantic_text field. Re-indexing now...`
  );

  return false;
}
