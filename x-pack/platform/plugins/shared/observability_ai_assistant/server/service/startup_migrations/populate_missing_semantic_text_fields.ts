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
import { LockManagerService } from '@kbn/lock-manager';
import { KnowledgeBaseEntry } from '../../../common';
import { resourceNames } from '..';
import { waitForKbModel } from '../inference_endpoint';
import { ObservabilityAIAssistantPluginStartDependencies } from '../../types';
import { ObservabilityAIAssistantConfig } from '../../config';
import { sleep } from '../util/sleep';
import { getInferenceIdFromWriteIndex } from '../knowledge_base_service/get_inference_id_from_write_index';

const POPULATE_MISSING_SEMANTIC_TEXT_FIELDS_LOCK_ID = 'populate_missing_semantic_text_fields';
export async function populateMissingSemanticTextFieldWithLock({
  core,
  logger,
  config,
  esClient,
}: {
  core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
  logger: Logger;
  config: ObservabilityAIAssistantConfig;
  esClient: { asInternalUser: ElasticsearchClient };
}) {
  const lmService = new LockManagerService(core, logger);
  await lmService.withLock(POPULATE_MISSING_SEMANTIC_TEXT_FIELDS_LOCK_ID, async () =>
    populateMissingSemanticTextFieldRecursively({ esClient, logger, config })
  );
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

  const inferenceId = await getInferenceIdFromWriteIndex(esClient);
  await waitForKbModel({ esClient, logger, config, inferenceId });

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
