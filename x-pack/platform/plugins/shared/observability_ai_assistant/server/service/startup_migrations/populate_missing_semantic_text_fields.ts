/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import { LockManagerService } from '@kbn/lock-manager';
import pRetry from 'p-retry';
import { resourceNames } from '..';
import { waitForKbModel } from '../inference_endpoint';
import { ObservabilityAIAssistantPluginStartDependencies } from '../../types';
import { ObservabilityAIAssistantConfig } from '../../config';
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
    populateMissingSemanticTextField({ core, esClient, logger, config })
  );
}

// Ensures that every doc has populated the `semantic_text` field.
async function populateMissingSemanticTextField({
  core,
  esClient,
  logger,
  config,
}: {
  core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
  esClient: { asInternalUser: ElasticsearchClient };
  logger: Logger;
  config: ObservabilityAIAssistantConfig;
}) {
  logger.debug(
    'Checking for remaining entries without semantic_text field that need to be migrated'
  );

  await pRetry(
    async () => {
      const inferenceId = await getInferenceIdFromWriteIndex(esClient);
      await waitForKbModel({ core, esClient, logger, config, inferenceId });

      await esClient.asInternalUser.updateByQuery({
        index: resourceNames.writeIndexAlias.kb,
        requests_per_second: 100,
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
}
