/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { transformError } from '@kbn/securitysolution-es-utils';
import type { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { actionResponsesTransform } from './action_responses_transform';
import { ENDPOINT_ASSETS_DEFAULT_NAMESPACE } from '../../common/constants';
import {
  getEndpointAssetsTransformConfig,
  getEndpointAssetsPipelineConfig,
} from '../lib/endpoint_assets';

// TODO: Move transforms to integration package
export const initializeTransforms = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<void> => {
  await Promise.all([
    initializeTransform(esClient, actionResponsesTransform, logger),
    initializeEndpointAssetsTransform(esClient, logger),
  ]);
};

/**
 * Initialize endpoint assets transform and pipeline.
 * Creates the ingest pipeline first (required by transform), then creates and starts the transform.
 */
const initializeEndpointAssetsTransform = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<void> => {
  const namespace = ENDPOINT_ASSETS_DEFAULT_NAMESPACE;

  try {
    // 1. Create ingest pipeline first (transform references it)
    const pipelineConfig = getEndpointAssetsPipelineConfig(namespace);
    await createPipelineIfNotExists(esClient, pipelineConfig, logger);

    // 2. Create and start transform
    const transformConfig = getEndpointAssetsTransformConfig(namespace);
    const succeeded = await createTransformIfNotExists(esClient, transformConfig, logger);
    if (succeeded) {
      await startTransformIfNotStarted(esClient, transformConfig.transform_id, logger);
    }
  } catch (error) {
    const err = transformError(error);
    logger.error(`Failed to initialize endpoint assets: ${err.message}`);
  }
};

/**
 * Create ingest pipeline if it doesn't exist.
 */
const createPipelineIfNotExists = async (
  esClient: ElasticsearchClient,
  pipeline: { id: string; [key: string]: unknown },
  logger: Logger
): Promise<boolean> => {
  try {
    await esClient.ingest.getPipeline({ id: pipeline.id });
    logger.debug(`Pipeline already exists: ${pipeline.id}`);
    return true;
  } catch (existErr) {
    const existError = transformError(existErr);
    if (existError.statusCode === 404) {
      try {
        await esClient.ingest.putPipeline(pipeline);
        logger.debug(`Created pipeline: ${pipeline.id}`);
        return true;
      } catch (createErr) {
        const createError = transformError(createErr);
        logger.error(`Failed to create pipeline ${pipeline.id}: ${createError.message}`);
      }
    } else {
      logger.error(`Failed to check if pipeline ${pipeline.id} exists: ${existError.message}`);
    }
  }
  return false;
};

export const initializeTransform = async (
  esClient: ElasticsearchClient,
  transform: TransformPutTransformRequest,
  logger: Logger
) => {
  const succeeded = await createTransformIfNotExists(esClient, transform, logger);
  if (succeeded) {
    await startTransformIfNotStarted(esClient, transform.transform_id, logger);
  }
};

/**
 * Checks if a transform exists, And if not creates it
 *
 * @param transform - the transform to create. If a transform with the same transform_id already exists, nothing is created or updated.
 *
 * @return true if the transform exits or created, false otherwise.
 */
export const createTransformIfNotExists = async (
  esClient: ElasticsearchClient,
  transform: TransformPutTransformRequest,
  logger: Logger
) => {
  try {
    await esClient.transform.getTransform({
      transform_id: transform.transform_id,
    });

    return true;
  } catch (existErr) {
    const existError = transformError(existErr);
    if (existError.statusCode === 404) {
      try {
        await esClient.transform.putTransform(transform);

        return true;
      } catch (createErr) {
        const createError = transformError(createErr);
        logger.error(
          `Failed to create transform ${transform.transform_id}: ${createError.message}`
        );
      }
    } else {
      logger.error(
        `Failed to check if transform ${transform.transform_id} exists: ${existError.message}`
      );
    }
  }

  return false;
};

export const startTransformIfNotStarted = async (
  esClient: ElasticsearchClient,
  transformId: string,
  logger: Logger
) => {
  try {
    const transformStats = await esClient.transform.getTransformStats({
      transform_id: transformId,
    });
    if (transformStats.count <= 0) {
      logger.error(`Failed starting transform ${transformId}: couldn't find transform`);

      return;
    }

    const fetchedTransformStats = transformStats.transforms[0];
    if (fetchedTransformStats.state === 'stopped') {
      try {
        return await esClient.transform.startTransform({ transform_id: transformId });
      } catch (startErr) {
        const startError = transformError(startErr);
        logger.error(`Failed starting transform ${transformId}: ${startError.message}`);
      }
    } else if (
      fetchedTransformStats.state === 'stopping' ||
      fetchedTransformStats.state === 'aborting' ||
      fetchedTransformStats.state === 'failed'
    ) {
      logger.error(
        `Not starting transform ${transformId} since it's state is: ${fetchedTransformStats.state}`
      );
    }
  } catch (statsErr) {
    const statsError = transformError(statsErr);
    logger.error(`Failed to check if transform ${transformId} is started: ${statsError.message}`);
  }
};
