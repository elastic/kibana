/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import type { KiPartialFields } from '../../common/step_types/ki';
import { omitNullKiAttributes } from '../../common/step_types/ki';
import type { KiLifecycleStatus } from '../../common/step_types/ki';
import { KiNotFoundError, KiUpdateConflictError, KiWriteValidationError } from './errors';
import {
  appendKiRevision,
  findKiRevision,
  isKiDeleted,
  type KiWriter,
} from '../step_types/helpers';

export interface UpdateKiDocumentOptions {
  esClient: ElasticsearchClient;
  aiIndexId: string;
  dest: AiIndexDest;
  kiId: string;
  backingIndex?: string;
  ki: KiPartialFields;
  lifecycle?: { status: KiLifecycleStatus };
  force?: boolean;
  refresh?: boolean;
  writer: KiWriter;
  abortSignal?: AbortSignal;
}

export interface UpdateKiDocumentResult {
  id: string;
  result: 'updated' | 'noop';
}

export const kiWriterFromUi = (spaceId: string): KiWriter => ({
  uri: 'kibana://context_engine/ui',
  metadata: { space_id: spaceId },
});

const assertBackingIndex = (dest: AiIndexDest, backingIndex?: string): void => {
  if (dest.type === 'index' && (backingIndex === undefined || backingIndex.length === 0)) {
    throw new KiWriteValidationError(
      'The backing index query parameter is required for this AI index destination.'
    );
  }
};

/** Applies a partial update to the current KI revision (workflow step and HTTP API). */
export const updateKiDocument = async ({
  esClient,
  aiIndexId,
  dest,
  kiId,
  backingIndex,
  ki: rawKi,
  lifecycle,
  force = false,
  refresh = true,
  writer,
  abortSignal = new AbortController().signal,
}: UpdateKiDocumentOptions): Promise<UpdateKiDocumentResult> => {
  assertBackingIndex(dest, backingIndex);
  const ki = omitNullKiAttributes(rawKi);

  const revision = await findKiRevision({
    esClient,
    aiIndexId,
    dest,
    kiId,
    backingIndex,
    abortSignal,
  });
  if (!revision) {
    throw new KiNotFoundError(aiIndexId, kiId);
  }
  if (isKiDeleted(revision.source) && !force) {
    throw new KiWriteValidationError(
      `KI '${kiId}' in AI index '${aiIndexId}' has lifecycle status deleted`
    );
  }
  if (Object.keys(ki).length === 0 && lifecycle === undefined) {
    return { id: kiId, result: 'noop' };
  }

  const now = new Date().toISOString();
  const changes = {
    ...ki,
    updated_at: now,
    governance: { provenance: { updated_by: writer }, ...(lifecycle && { lifecycle }) },
  };

  if (dest.type === 'data_stream') {
    await appendKiRevision({
      esClient,
      destValue: dest.value,
      kiId,
      source: revision.source,
      changes,
      refresh,
      abortSignal,
    });
    return { id: kiId, result: 'updated' };
  }

  const response = await esClient
    .update(
      {
        index: revision.index,
        id: revision.documentId,
        doc: changes,
        if_seq_no: revision.seqNo,
        if_primary_term: revision.primaryTerm,
        ...(refresh && { refresh: 'wait_for' as const }),
      },
      { signal: abortSignal }
    )
    .catch((error) => {
      if (isResponseError(error) && error.statusCode === 404) {
        throw new KiNotFoundError(aiIndexId, kiId);
      }
      if (isResponseError(error) && error.statusCode === 409) {
        throw new KiUpdateConflictError(aiIndexId, kiId);
      }
      throw error;
    });

  return {
    id: kiId,
    result: response.result === 'noop' ? 'noop' : 'updated',
  };
};

export interface DeleteKiOptions {
  esClient: ElasticsearchClient;
  aiIndexId: string;
  dest: AiIndexDest;
  kiId: string;
  backingIndex?: string;
  writer: KiWriter;
  abortSignal?: AbortSignal;
}

/** Soft-deletes a Knowledge Indicator by setting lifecycle status to deleted. */
export const deleteKi = async ({
  esClient,
  aiIndexId,
  dest,
  kiId,
  backingIndex,
  writer,
  abortSignal,
}: DeleteKiOptions): Promise<{ id: string }> => {
  assertBackingIndex(dest, backingIndex);

  const signal = abortSignal ?? new AbortController().signal;
  const revision = await findKiRevision({
    esClient,
    aiIndexId,
    dest,
    kiId,
    backingIndex,
    abortSignal: signal,
  });
  if (!revision) {
    throw new KiNotFoundError(aiIndexId, kiId);
  }

  if (isKiDeleted(revision.source)) {
    return { id: kiId };
  }

  await updateKiDocument({
    esClient,
    aiIndexId,
    dest,
    kiId,
    backingIndex,
    ki: {},
    lifecycle: { status: 'deleted' },
    force: true,
    writer,
    abortSignal,
  });

  return { id: kiId };
};

export type RestoreKiOptions = DeleteKiOptions;

/** Restores a soft-deleted Knowledge Indicator by setting lifecycle status to active. */
export const restoreKi = async ({
  esClient,
  aiIndexId,
  dest,
  kiId,
  backingIndex,
  writer,
  abortSignal,
}: RestoreKiOptions): Promise<{ id: string }> => {
  assertBackingIndex(dest, backingIndex);

  const signal = abortSignal ?? new AbortController().signal;
  const revision = await findKiRevision({
    esClient,
    aiIndexId,
    dest,
    kiId,
    backingIndex,
    abortSignal: signal,
  });
  if (!revision) {
    throw new KiNotFoundError(aiIndexId, kiId);
  }

  if (!isKiDeleted(revision.source)) {
    return { id: kiId };
  }

  await updateKiDocument({
    esClient,
    aiIndexId,
    dest,
    kiId,
    backingIndex,
    ki: {},
    lifecycle: { status: 'active' },
    force: true,
    writer,
    abortSignal,
  });

  return { id: kiId };
};
