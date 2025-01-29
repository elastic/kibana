/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EntityDefinition } from '@kbn/entities-schema';
import { generateLatestIngestPipelineId } from './helpers/generate_component_id';
import { retryTransientEsErrors } from './helpers/retry';
import { generateLatestProcessors } from './ingest_pipeline/generate_latest_processors';

export async function createAndInstallIngestPipelines(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger
): Promise<Array<{ type: 'ingest_pipeline'; id: string }>> {
  try {
    const latestProcessors = generateLatestProcessors(definition);
    const latestId = generateLatestIngestPipelineId(definition);
    await retryTransientEsErrors(
      () =>
        esClient.ingest.putPipeline({
          id: latestId,
          processors: latestProcessors,
          _meta: {
            definition_version: definition.version,
            managed: definition.managed,
          },
        }),
      { logger }
    );
    return [{ type: 'ingest_pipeline', id: latestId }];
  } catch (e) {
    logger.error(
      `Cannot create entity latest ingest pipelines for [${definition.id}] entity definition`
    );
    throw e;
  }
}
