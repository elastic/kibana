/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EntityDefinition } from '@kbn/entities-schema';
import { retryTransientEsErrors } from './helpers/retry';
import { generateLatestTransform } from './transform/generate_latest_transform';

export async function createAndInstallTransforms(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger
): Promise<Array<{ type: 'transform'; id: string }>> {
  // Latest transform
  try {
    const latestTransform = generateLatestTransform(definition);
    await retryTransientEsErrors(() => esClient.transform.putTransform(latestTransform), {
      logger,
    });
    return [{ type: 'transform', id: latestTransform.transform_id }];
  } catch (e) {
    logger.error(
      `Cannot create entity history transform for [${definition.id}] entity definition`,
      { error: e }
    );
    throw e;
  }

  // TODO(kuba): add backfill transform deletion as well
  // Backfill transform
  try {
    const backfillTransform = generateLatestTransformBackfill(definition);
    await retryTransientEsErrors(() => esClient.transform.putTransform(backfillTransform), {
      logger,
    });
    return [{ type: 'transform', id: backfillTransform.transform_id }];
  } catch (e) {
    logger.error(
      `Cannot create backfill transform for [${definition.id}] entity definition`,
      { error: e }
    );
    throw e;
  }
}
