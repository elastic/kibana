/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EntityDefinition } from '@kbn/entities-schema';

import { retryTransientEsErrors } from './helpers/retry';
import { generateLatestTransformId } from './helpers/generate_component_id';

export async function stopTransforms(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger
) {
  try {
    await Promise.all(
      (definition.installedComponents ?? [])
        .filter(({ type }) => type === 'transform')
        .map(({ id }) =>
          retryTransientEsErrors(
            () =>
              esClient.transform.stopTransform(
                { transform_id: id, wait_for_completion: true, force: true },
                { ignore: [409, 404] }
              ),
            { logger }
          )
        )
    );
  } catch (e) {
    logger.error(`Cannot stop transforms for definition [${definition.id}]: ${e}`);
    throw e;
  }
}

export async function stopLatestTransform(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger
) {
  try {
    await retryTransientEsErrors(
      () =>
        esClient.transform.stopTransform(
          {
            transform_id: generateLatestTransformId(definition),
            wait_for_completion: true,
            force: true,
          },
          { ignore: [409, 404] }
        ),
      { logger }
    );
  } catch (e) {
    logger.error(`Cannot stop latest transform for definition [${definition.id}]: ${e}`);
    throw e;
  }
}
