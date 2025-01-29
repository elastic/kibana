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

export async function deleteTransforms(
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
              esClient.transform.deleteTransform(
                { transform_id: id, force: true },
                { ignore: [404] }
              ),
            { logger }
          )
        )
    );
  } catch (e) {
    logger.error(`Cannot delete transforms for definition [${definition.id}]: ${e}`);
    throw e;
  }
}

export async function deleteLatestTransform(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger
) {
  try {
    await retryTransientEsErrors(
      () =>
        esClient.transform.deleteTransform(
          { transform_id: generateLatestTransformId(definition), force: true },
          { ignore: [404] }
        ),
      { logger }
    );
  } catch (e) {
    logger.error(`Cannot delete latest transform for definition [${definition.id}]: ${e}`);
    throw e;
  }
}
