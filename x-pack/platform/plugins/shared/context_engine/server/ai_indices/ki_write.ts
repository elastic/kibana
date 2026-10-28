/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import type { KiLifecycleStatus, KiPartialFields } from '../../common/step_types/ki';
import { KiDeletedError } from './errors';
import {
  getKiRevision,
  isKiDeleted,
  writeKiRevision,
  type KiWriter,
  type StoredKi,
} from './ki_revision';

export type KiApiWriterAction = 'update' | 'delete' | 'restore';

export const buildKiApiWriter = (action: KiApiWriterAction, spaceId: string): KiWriter => ({
  uri: `api://context_engine.ki.${action}`,
  metadata: { space_id: spaceId },
});

/** Whether every field in `ki` (and the lifecycle status) matches the stored KI.
 * It doesn't compare other governance fields like provenance.
 */
const isNoopUpdate = (
  source: StoredKi,
  ki: KiPartialFields,
  lifecycle?: { status: KiLifecycleStatus }
): boolean => {
  if (lifecycle !== undefined && lifecycle.status !== source.governance?.lifecycle?.status) {
    return false;
  }
  // We need to loop entries and use isEqual instead of isMatch because it treats arrays as unordered subsets, so shrinking tags would look unchanged.
  return Object.entries(ki).every(([key, value]) => isEqual(source[key], value));
};

export interface UpdateKiOptions {
  aiIndexId: string;
  dest: AiIndexDest;
  kiId: string;
  ki: KiPartialFields;
  writer: KiWriter;
  backingIndex?: string;
  /** Bypasses the deleted-KI guard, allowing updates to an already soft-deleted KI. */
  force?: boolean;
  lifecycle?: { status: KiLifecycleStatus };
  refresh?: boolean;
  abortSignal?: AbortSignal;
}

/** Updates the current revision of a KI in place or appends a data-stream revision. */
export const updateKi = async (
  esClient: ElasticsearchClient,
  options: UpdateKiOptions
): Promise<{ id: string; result: 'updated' | 'noop' }> => {
  const {
    aiIndexId,
    dest,
    kiId,
    ki,
    writer,
    backingIndex,
    force = false,
    lifecycle,
    refresh = true,
    abortSignal,
  } = options;

  const revision = await getKiRevision({
    esClient,
    aiIndexId,
    dest,
    kiId,
    backingIndex,
    includeSource: true,
    abortSignal,
  });
  if (isKiDeleted(revision.source) && !force) {
    throw new KiDeletedError(aiIndexId, kiId, 'restore the deleted KI before updating it');
  }

  if (isNoopUpdate(revision.source, ki, lifecycle)) {
    return { id: kiId, result: 'noop' };
  }

  const now = new Date().toISOString();
  const changes = {
    ...ki,
    updated_at: now,
    governance: { provenance: { updated_by: writer }, ...(lifecycle && { lifecycle }) },
  };

  const { result } = await writeKiRevision({
    esClient,
    aiIndexId,
    dest,
    kiId,
    revision,
    changes,
    refresh,
    abortSignal,
  });

  return { id: kiId, result };
};

export interface SoftDeleteKiOptions {
  aiIndexId: string;
  dest: AiIndexDest;
  kiId: string;
  writer: KiWriter;
  backingIndex?: string;
  refresh?: boolean;
  abortSignal?: AbortSignal;
}

/** Marks a KI as deleted via lifecycle tombstone without removing the document. */
export const softDeleteKi = async (
  esClient: ElasticsearchClient,
  options: SoftDeleteKiOptions
): Promise<{ id: string }> => {
  const { aiIndexId, dest, kiId, writer, backingIndex, refresh = true, abortSignal } = options;

  const revision = await getKiRevision({
    esClient,
    aiIndexId,
    dest,
    kiId,
    backingIndex,
    abortSignal,
  });
  if (isKiDeleted(revision.source)) {
    return { id: kiId };
  }

  const now = new Date().toISOString();
  const changes = {
    updated_at: now,
    governance: {
      provenance: { updated_by: writer },
      lifecycle: { status: 'deleted' as const },
    },
  };

  await writeKiRevision({
    esClient,
    aiIndexId,
    dest,
    kiId,
    revision,
    changes,
    refresh,
    abortSignal,
  });

  return { id: kiId };
};

export interface RestoreKiOptions {
  aiIndexId: string;
  dest: AiIndexDest;
  kiId: string;
  writer: KiWriter;
  backingIndex?: string;
  refresh?: boolean;
  abortSignal?: AbortSignal;
}

/** Restores a soft-deleted KI by setting lifecycle status back to active. */
export const restoreKi = async (
  esClient: ElasticsearchClient,
  options: RestoreKiOptions
): Promise<{ id: string }> => {
  const { aiIndexId, dest, kiId, writer, backingIndex, refresh = true, abortSignal } = options;

  const revision = await getKiRevision({
    esClient,
    aiIndexId,
    dest,
    kiId,
    backingIndex,
    abortSignal,
  });
  if (!isKiDeleted(revision.source)) {
    return { id: kiId };
  }

  const now = new Date().toISOString();
  const changes = {
    updated_at: now,
    governance: {
      provenance: { updated_by: writer },
      lifecycle: { status: 'active' as const },
    },
  };

  await writeKiRevision({
    esClient,
    aiIndexId,
    dest,
    kiId,
    revision,
    changes,
    refresh,
    abortSignal,
  });

  return { id: kiId };
};
