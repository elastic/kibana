/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EntityDefinition } from '@kbn/entities-schema';
import { retryTransientEsErrors } from './helpers/retry';
import { generateLatestIngestPipelineId } from './helpers/generate_component_id';

export async function deleteIngestPipelines(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger
) {
  try {
    await Promise.all(
      (definition.installedComponents ?? [])
        .filter(({ type }) => type === 'ingest_pipeline')
        .map(({ id }) =>
          retryTransientEsErrors(() => esClient.ingest.deletePipeline({ id }, { ignore: [404] }))
        )
    );
  } catch (e) {
    logger.error(`Unable to delete ingest pipelines for definition [${definition.id}]: ${e}`);
    throw e;
  }
}

export async function deleteLatestIngestPipeline(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger
) {
  try {
    await retryTransientEsErrors(() =>
      esClient.ingest.deletePipeline(
        { id: generateLatestIngestPipelineId(definition) },
        { ignore: [404] }
      )
    );
  } catch (e) {
    logger.error(`Unable to delete latest ingest pipeline [${definition.id}]: ${e}`);
    throw e;
  }
}
