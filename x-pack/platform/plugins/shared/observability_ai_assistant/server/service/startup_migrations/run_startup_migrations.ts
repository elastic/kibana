/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { CoreSetup, IClusterClient, Logger } from '@kbn/core/server';
import { errors } from '@elastic/elasticsearch';
import { LockManagerService, isLockAcquisitionError } from '@kbn/lock-manager';
import { LEGACY_CUSTOM_INFERENCE_ID } from '../../../common/preconfigured_inference_ids';
import { resourceNames } from '..';
import { ObservabilityAIAssistantPluginStartDependencies } from '../../types';
import { ObservabilityAIAssistantConfig } from '../../config';
import { reIndexKnowledgeBaseWithLock } from '../knowledge_base_service/reindex_knowledge_base';
import { hasKbWriteIndex } from '../knowledge_base_service/has_kb_index';
import { updateExistingIndexAssets } from '../index_assets/update_existing_index_assets';

const PLUGIN_STARTUP_LOCK_ID = 'observability_ai_assistant:startup_migrations';

// This function performs necessary startup migrations for the observability AI assistant:
// 1. Updates index assets to ensure mappings are correct
// 2. If the knowledge base index does not support the `semantic_text` field, it is re-indexed.
// 3. Populates the `semantic_text` field for knowledge base entries
export async function runStartupMigrations({
  core,
  logger,
  config,
}: {
  core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
  logger: Logger;
  config: ObservabilityAIAssistantConfig;
}) {
  // update index assets to ensure mappings are correct
  await updateExistingIndexAssets({ logger, core });

  const [coreStart] = await core.getStartServices();
  const esClient = coreStart.elasticsearch.client;

  // allow inference endpoint to scale to zero
  await allowInferenceEndpointScaleToZero({ esClient, logger });

  const lmService = new LockManagerService(core, logger);
  await lmService
    .withLock(PLUGIN_STARTUP_LOCK_ID, async () => {
      const doesKbIndexExist = await hasKbWriteIndex({ esClient });

      if (!doesKbIndexExist) {
        logger.info('Knowledge base index does not exist. Aborting updating index assets');
        return;
      }

      const isKbSemanticTextCompatible = await isKnowledgeBaseSemanticTextCompatible({
        logger,
        esClient,
      });

      if (!isKbSemanticTextCompatible) {
        await reIndexKnowledgeBaseWithLock({ core, logger, esClient });
      }
    })
    .catch((error) => {
      // we should propogate the error if it is not a LockAcquisitionError
      if (!isLockAcquisitionError(error)) {
        throw error;
      }
      logger.info('Startup migrations are already in progress. Aborting startup migrations');
    });
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
    index: resourceNames.writeIndexAlias.kb,
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

export function isSemanticTextUnsupportedError(error: Error) {
  const semanticTextUnsupportedError =
    'The [sparse_vector] field type is not supported on indices created on versions 8.0 to 8.10';

  const isSemanticTextUnspported =
    error instanceof errors.ResponseError &&
    (error.message.includes(semanticTextUnsupportedError) ||
      // @ts-expect-error
      error.meta?.body?.error?.caused_by?.reason.includes(semanticTextUnsupportedError));

  return isSemanticTextUnspported;
}

async function allowInferenceEndpointScaleToZero({
  esClient,
  logger,
}: {
  esClient: IClusterClient;
  logger: Logger;
}) {
  try {
    const response = await esClient.asInternalUser.ml.getTrainedModelsStats({
      model_id: LEGACY_CUSTOM_INFERENCE_ID,
    });

    if (response.count === 0) {
      logger.debug(`Inference endpoint ${LEGACY_CUSTOM_INFERENCE_ID} not found. Skipping.`);
      return;
    }

    if (
      response.trained_model_stats[0].deployment_stats?.adaptive_allocations
        ?.min_number_of_allocations === 0
    ) {
      logger.debug(
        `Inference endpoint ${LEGACY_CUSTOM_INFERENCE_ID} already allows scaling to zero. Skipping.`
      );
      return;
    }

    logger.info(
      `${LEGACY_CUSTOM_INFERENCE_ID} is not configured to scale to zero. Updating it now.`
    );

    const res = await esClient.asInternalUser.ml.updateTrainedModelDeployment({
      model_id: LEGACY_CUSTOM_INFERENCE_ID,
      adaptive_allocations: {
        enabled: true,
        min_number_of_allocations: 0,
        max_number_of_allocations: 8,
      },
    });

    logger.debug(
      `Inference endpoint ${LEGACY_CUSTOM_INFERENCE_ID} was updated to scale to zero: ${JSON.stringify(
        res
      )}`
    );
  } catch (err) {
    logger.error(
      `Error updating inference endpoint ${LEGACY_CUSTOM_INFERENCE_ID} to scale to zero: ${err}`
    );
  }
}
