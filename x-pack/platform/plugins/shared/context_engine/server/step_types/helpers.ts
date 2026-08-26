/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import { ExecutionError } from '@kbn/workflows/server';
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { isIndexPattern, validateAiIndexId } from '../../common/ai_index_dest';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import { AiIndexAlreadyExistsError, AiIndexNotFoundError } from '../ai_indices/errors';
import type { AiIndexService } from '../ai_indices/service';

/** Dependencies injected into the KI step definition factories. */
export interface KiStepDependencies {
  getAiIndexService: () => AiIndexService;
  /** Whether the Context Engine advanced setting is on in the request's space. */
  isContextEngineEnabled: (request: KibanaRequest) => Promise<boolean>;
  /** Whether the request has the Context Engine write API privilege. */
  checkWritePrivilege: (request: KibanaRequest) => Promise<boolean>;
}

/** Fails the step when the workflow user lacks the Context Engine write API privilege. */
export const assertKiWritePrivilege = async (
  checkWritePrivilege: (request: KibanaRequest) => Promise<boolean>,
  request: KibanaRequest
): Promise<void> => {
  if (!(await checkWritePrivilege(request))) {
    throw new ExecutionError({
      type: 'PermissionError',
      message: 'Insufficient privileges to modify knowledge indicators in AI indices',
    });
  }
};

/** Fails the step when the Context Engine setting is off in the request's space. */
export const assertContextEngineEnabled = async (
  isContextEngineEnabled: (request: KibanaRequest) => Promise<boolean>,
  request: KibanaRequest
): Promise<void> => {
  if (!(await isContextEngineEnabled(request))) {
    throw new ExecutionError({
      type: 'FeatureDisabledError',
      message: `Context Engine is disabled. Enable the '${CONTEXT_ENGINE_ENABLED_SETTING_ID}' advanced setting to use this step.`,
    });
  }
};

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
 * when it does not exist yet with the index dest derived from the id (the UI
 * create flow's default).
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

/** Fails the step when the dest is an index pattern, which cannot be a write target. */
export const assertWritableDest = (aiIndexId: string, dest: AiIndexDest): void => {
  if (isIndexPattern(dest.value)) {
    throw new ExecutionError({
      type: 'ValidationError',
      message: `Cannot create a KI in AI index '${aiIndexId}': dest '${dest.value}' is an index pattern, not a single write target`,
      details: { aiIndexId, destValue: dest.value },
    });
  }
};

/** The typed error for a KI that does not exist in the given AI index. */
export const kiNotFoundError = (aiIndexId: string, kiId: string): ExecutionError =>
  new ExecutionError({
    type: 'NotFoundError',
    message: `KI '${kiId}' not found in AI index '${aiIndexId}'`,
    details: { aiIndexId, kiId },
  });

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
  // A dest with no physical backing index yet must resolve to empty hits, not an error.
  const response = await esClient.search(
    {
      index: destValue,
      ignore_unavailable: true,
      allow_no_indices: true,
      query: { ids: { values: [kiId] } },
      size: 2,
      _source: false,
    },
    { signal: abortSignal }
  );

  const { hits } = response.hits;
  // A pattern dest can hold the same _id in multiple indices; refuse to pick one arbitrarily.
  if (hits.length > 1) {
    const indices = hits.flatMap((hit) => (hit._index ? [hit._index] : []));
    throw new ExecutionError({
      type: 'ValidationError',
      message: `KI '${kiId}' is ambiguous in AI index '${aiIndexId}': it exists in multiple backing indices (${indices.join(
        ', '
      )})`,
      details: { aiIndexId, kiId, indices },
    });
  }

  const backingIndex = hits[0]?._index;
  if (!backingIndex) {
    throw kiNotFoundError(aiIndexId, kiId);
  }
  return backingIndex;
};
