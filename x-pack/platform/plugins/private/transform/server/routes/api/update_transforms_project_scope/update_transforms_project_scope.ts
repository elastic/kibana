/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import type { ResponseStatus } from '../../api_schemas/common';
import type {
  UpdateTransformsProjectScopeRequestSchema,
  UpdateTransformsProjectScopeResponseSchema,
} from '../../api_schemas/update_transforms_project_scope';
import type { TransformId } from '../../../../common/types/transform';
import { updateTransform } from '../transforms_update/update_transform';

const GET_TRANSFORMS_CHUNK_SIZE = 100;

const chunkItems = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
};

const getErrorReason = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

const getErrorBody = (error: unknown): NonNullable<ResponseStatus['error']> => {
  const esError = (error as { meta?: { body?: { error?: ResponseStatus['error'] } } }).meta?.body
    ?.error;

  if (esError) {
    return esError;
  }

  return {
    type: 'error',
    reason: getErrorReason(error),
    root_cause: [],
    caused_by: {},
    response: error,
  };
};

const isResourceNotFoundError = (error: unknown): boolean => {
  const esError = (error as { meta?: { body?: { error?: { type?: string } } } }).meta?.body?.error;

  return esError?.type === 'resource_not_found_exception';
};

const createMissingTransformError = (transformId: TransformId): ResponseStatus['error'] => ({
  type: 'resource_not_found_exception',
  reason: `Transform ${transformId} could not be found.`,
  root_cause: [],
  caused_by: {},
  response: {},
});

const createMissingSourceError = (transformId: TransformId): ResponseStatus['error'] => ({
  type: 'status_exception',
  reason: `Transform ${transformId} does not have a source configuration.`,
  root_cause: [],
  caused_by: {},
  response: {},
});

const hasResultForTransform = (
  results: UpdateTransformsProjectScopeResponseSchema,
  transformId: TransformId
): boolean => Object.prototype.hasOwnProperty.call(results, transformId);

const getTransformsIndividually = async ({
  esClient,
  results,
  transformIds,
  transformsById,
}: {
  esClient: ElasticsearchClient;
  results: UpdateTransformsProjectScopeResponseSchema;
  transformIds: TransformId[];
  transformsById: Map<TransformId, estypes.TransformGetTransformTransformSummary>;
}): Promise<void> => {
  for (const transformId of transformIds) {
    try {
      const response = await esClient.transform.getTransform({
        allow_no_match: true,
        size: 1,
        transform_id: transformId,
      });
      const transform = response.transforms[0];

      if (transform) {
        transformsById.set(transform.id, transform);
      } else {
        results[transformId] = {
          success: false,
          error: createMissingTransformError(transformId),
        };
      }
    } catch (error) {
      results[transformId] = {
        success: false,
        error: isResourceNotFoundError(error)
          ? createMissingTransformError(transformId)
          : getErrorBody(error),
      };
    }
  }
};

const getTransformsById = async ({
  esClient,
  results,
  transformIds,
}: {
  esClient: ElasticsearchClient;
  results: UpdateTransformsProjectScopeResponseSchema;
  transformIds: TransformId[];
}): Promise<Map<TransformId, estypes.TransformGetTransformTransformSummary>> => {
  const transformsById = new Map<TransformId, estypes.TransformGetTransformTransformSummary>();
  const transformIdChunks = chunkItems(transformIds, GET_TRANSFORMS_CHUNK_SIZE);

  for (const transformIdChunk of transformIdChunks) {
    try {
      const response = await esClient.transform.getTransform({
        allow_no_match: true,
        size: transformIdChunk.length,
        transform_id: transformIdChunk.join(','),
      });

      for (const transform of response.transforms) {
        transformsById.set(transform.id, transform);
      }
    } catch (error) {
      if (isResourceNotFoundError(error)) {
        await getTransformsIndividually({
          esClient,
          results,
          transformIds: transformIdChunk,
          transformsById,
        });
        continue;
      }

      for (const transformId of transformIdChunk) {
        results[transformId] = { success: false, error: getErrorBody(error) };
      }
    }
  }

  return transformsById;
};

export async function updateTransformsProjectScope(
  request: UpdateTransformsProjectScopeRequestSchema,
  esClient: ElasticsearchClient
): Promise<UpdateTransformsProjectScopeResponseSchema> {
  const { projectRouting, transformsInfo } = request;
  const results: UpdateTransformsProjectScopeResponseSchema = {};
  const transformIds = transformsInfo.map(({ id }) => id);
  const transformsById = await getTransformsById({
    esClient,
    results,
    transformIds,
  });

  for (const transformId of transformIds) {
    if (hasResultForTransform(results, transformId)) {
      continue;
    }

    const transform = transformsById.get(transformId);

    if (!transform) {
      results[transformId] = {
        success: false,
        error: createMissingTransformError(transformId),
      };
      continue;
    }

    if (!transform.source) {
      results[transformId] = {
        success: false,
        error: createMissingSourceError(transformId),
      };
      continue;
    }

    try {
      await updateTransform({
        body: {
          source: {
            ...transform.source,
            project_routing: projectRouting,
          },
        },
        esClient,
        transformId,
      });

      results[transformId] = { success: true };
    } catch (error) {
      results[transformId] = { success: false, error: getErrorBody(error) };
    }
  }

  return results;
}
