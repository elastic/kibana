/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import type { UpdateKiBody } from '../../common/http_api/knowledge_indicators';
import { KiDeletedError } from './errors';
import { getKiRevision, isKiDeleted, writeKiRevision, type KiWriter } from './ki_revision';

export type KiApiWriterAction = 'update' | 'delete';

export const buildKiApiWriter = (action: KiApiWriterAction, spaceId: string): KiWriter => ({
  uri: `api://context_engine.ki.${action}`,
  metadata: { space_id: spaceId },
});

export interface UpdateKiOptions {
  aiIndexId: string;
  dest: AiIndexDest;
  kiId: string;
  ki: UpdateKiBody['ki'];
  writer: KiWriter;
  backingIndex?: string;
}

/** Updates the current revision of a KI in place or appends a data-stream revision. */
export const updateKi = async (
  esClient: ElasticsearchClient,
  options: UpdateKiOptions
): Promise<{ id: string; result: 'updated' | 'noop' }> => {
  const { aiIndexId, dest, kiId, ki, writer, backingIndex } = options;

  const revision = await getKiRevision({
    esClient,
    aiIndexId,
    dest,
    kiId,
    backingIndex,
  });
  if (isKiDeleted(revision.source)) {
    throw new KiDeletedError(aiIndexId, kiId, 'restore the deleted KI before updating it');
  }

  const now = new Date().toISOString();
  const changes = {
    ...ki,
    updated_at: now,
    governance: { provenance: { updated_by: writer } },
  };

  const { result } = await writeKiRevision({
    esClient,
    aiIndexId,
    dest,
    kiId,
    revision,
    changes,
    refresh: true,
  });

  return { id: kiId, result };
};

export interface SoftDeleteKiOptions {
  aiIndexId: string;
  dest: AiIndexDest;
  kiId: string;
  writer: KiWriter;
  backingIndex?: string;
}

/** Marks a KI as deleted via lifecycle tombstone without removing the document. */
export const softDeleteKi = async (
  esClient: ElasticsearchClient,
  options: SoftDeleteKiOptions
): Promise<{ id: string }> => {
  const { aiIndexId, dest, kiId, writer, backingIndex } = options;

  const revision = await getKiRevision({
    esClient,
    aiIndexId,
    dest,
    kiId,
    backingIndex,
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
    refresh: true,
  });

  return { id: kiId };
};

export interface RestoreKiOptions {
  aiIndexId: string;
  dest: AiIndexDest;
  kiId: string;
  writer: KiWriter;
  backingIndex?: string;
}

/** Restores a soft-deleted KI by setting lifecycle status back to active. */
export const restoreKi = async (
  esClient: ElasticsearchClient,
  options: RestoreKiOptions
): Promise<{ id: string }> => {
  const { aiIndexId, dest, kiId, writer, backingIndex } = options;

  const revision = await getKiRevision({
    esClient,
    aiIndexId,
    dest,
    kiId,
    backingIndex,
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
    refresh: true,
  });

  return { id: kiId };
};
