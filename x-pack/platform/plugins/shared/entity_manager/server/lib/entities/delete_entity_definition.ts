/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { EntityDefinition } from '@kbn/entities-schema';
import type { Logger } from '@kbn/logging';
import { generateLatestIndexTemplateId } from './helpers/generate_component_id';
import { deleteIngestPipelines, deleteLatestIngestPipeline } from './delete_ingest_pipeline';
import { deleteTemplate, deleteTemplates } from '../manage_index_templates';
import { EntityDefinitionNotFound } from './errors/entity_not_found';
import { stopLatestTransform, stopTransforms } from './stop_transforms';
import { deleteLatestTransform, deleteTransforms } from './delete_transforms';
import { deleteIndices } from './delete_index';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { SO_ENTITY_DEFINITION_TYPE } from '../../saved_objects';

export async function deleteAllData(esClient: ElasticsearchClient, definition: EntityDefinition, logger: Logger) {
  await deleteIndices(esClient, definition, logger)
}

export async function deleteAllComponents(esClient: ElasticsearchClient, definition: EntityDefinition, logger: Logger, deleteData?: boolean) {
  await stopLatestTransform(esClient, definition, logger);
  await stopTransforms(esClient, definition, logger);
  await deleteLatestTransform(esClient, definition, logger);
  await deleteTransforms(esClient, definition, logger);

  await deleteLatestIngestPipeline(esClient, definition, logger);
  await deleteIngestPipelines(esClient, definition, logger);

  await deleteTemplate({
    esClient,
    logger,
    name: generateLatestIndexTemplateId(definition),
  });
  await deleteTemplates(esClient, definition, logger);

  if (deleteData) {
    await deleteAllData(esClient, definition, logger);
  }
}

export async function deleteEntityDefinition(
  soClient: SavedObjectsClientContract,
  definition: EntityDefinition
) {
  try {
    await soClient.delete(SO_ENTITY_DEFINITION_TYPE, definition.id);
  } catch (err) {
    if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
      throw new EntityDefinitionNotFound(`Entity definition with [${definition.id}] not found.`);
    }

    throw err;
  }
}
