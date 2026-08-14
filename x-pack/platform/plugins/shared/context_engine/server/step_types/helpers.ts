/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ExecutionError } from '@kbn/workflows/server';
import { validateAiIndexId } from '../../common/ai_index_dest';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import { AiIndexAlreadyExistsError, AiIndexNotFoundError } from '../ai_indices/errors';
import type { AiIndexService } from '../ai_indices/service';

/** Resolves an AI index id to its backing store, failing the step when the id is unknown. */
export const resolveAiIndexDest = async (
  getAiIndexService: () => AiIndexService,
  aiIndexId: string
): Promise<AiIndexDest> => {
  try {
    const { dest } = await getAiIndexService().get(aiIndexId);
    return dest;
  } catch (error) {
    if (error instanceof AiIndexNotFoundError) {
      throw new ExecutionError({
        type: 'NotFoundError',
        message: `AI index '${aiIndexId}' not found`,
        details: { aiIndexId },
      });
    }
    throw error;
  }
};

/**
 * Resolves an AI index id to its backing store, lazily creating the AI index
 * when it does not exist yet. Lazily created AI indices use the index backing
 * store derived from the id, matching the UI create flow's default.
 */
export const resolveOrCreateAiIndexDest = async (
  getAiIndexService: () => AiIndexService,
  aiIndexId: string
): Promise<AiIndexDest> => {
  const service = getAiIndexService();

  try {
    const { dest } = await service.get(aiIndexId);
    return dest;
  } catch (error) {
    if (!(error instanceof AiIndexNotFoundError)) {
      throw error;
    }
  }

  const { dest, error: idError } = validateAiIndexId('index', aiIndexId);
  if (idError !== undefined || dest === undefined) {
    throw new ExecutionError({
      type: 'ValidationError',
      message: `Cannot create AI index '${aiIndexId}': ${idError}`,
      details: { aiIndexId },
    });
  }

  try {
    await service.create(aiIndexId, { dest, automations: [], sources: [] });
  } catch (error) {
    if (error instanceof AiIndexAlreadyExistsError) {
      // Lost a concurrent creation race; the AI index exists now.
      const { dest: existingDest } = await service.get(aiIndexId);
      return existingDest;
    }
    throw error;
  }

  return dest;
};

/**
 * Finds the concrete index holding a KI document. Update and delete must target
 * the backing index directly since the dest may be a data stream or a pattern.
 */
export const findKiBackingIndex = async ({
  esClient,
  aiIndexId,
  destValue,
  kiId,
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  aiIndexId: string;
  destValue: string;
  kiId: string;
  abortSignal: AbortSignal;
}): Promise<string> => {
  const response = await esClient.search(
    {
      index: destValue,
      query: { ids: { values: [kiId] } },
      size: 1,
      _source: false,
    },
    { signal: abortSignal }
  );

  const backingIndex = response.hits.hits[0]?._index;
  if (!backingIndex) {
    throw new ExecutionError({
      type: 'NotFoundError',
      message: `KI '${kiId}' not found in AI index '${aiIndexId}'`,
      details: { aiIndexId, kiId },
    });
  }
  return backingIndex;
};
