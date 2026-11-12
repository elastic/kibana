/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type { ElasticsearchClient } from '@kbn/core/server';
import { EDITED_AT_ATTRIBUTE, EDITED_BY_ATTRIBUTE, isDreamedKiType } from '../../common/dreaming';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import type { KiLifecycleStatus, KiPartialFields } from '../../common/step_types/ki';
import { KiDeletedError, KiNotFoundError } from './errors';
import { findLinkingRelationshipIds } from './ki_relationships';
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

const KI_API_UPDATE_URI = buildKiApiWriter('update', '').uri;

const PERSON_EDITED_FIELDS = ['type', 'title', 'description', 'content', 'attributes'] as const;

const attributesOf = (ki: StoredKi | undefined): Record<string, unknown> | undefined => {
  const attributes = ki?.attributes;
  return typeof attributes === 'object' && attributes !== null && !Array.isArray(attributes)
    ? (attributes as Record<string, unknown>)
    : undefined;
};

/**
 * Whether a person edited what the KI says, so automation must leave its text alone. KIs edited
 * before the marker existed count when the KI update API wrote their current revision.
 */
export const isPersonEdited = (ki: StoredKi | undefined): boolean =>
  attributesOf(ki)?.[EDITED_BY_ATTRIBUTE] !== undefined ||
  ki?.governance?.provenance?.updated_by?.uri === KI_API_UPDATE_URI;

const changesWhatItSays = (source: StoredKi, ki: KiPartialFields): boolean =>
  PERSON_EDITED_FIELDS.some(
    (field) => ki[field] !== undefined && !isEqual(source[field], ki[field])
  );

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
  /** Marks the KI as edited by a person when the update changes what it says. */
  personEdit?: boolean;
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
    personEdit = false,
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
  const edited = personEdit && changesWhatItSays(revision.source, ki);
  const changes = {
    ...ki,
    ...(edited && {
      attributes: {
        ...ki.attributes,
        [EDITED_BY_ATTRIBUTE]: writer.uri,
        [EDITED_AT_ATTRIBUTE]: now,
      },
    }),
    updated_at: now,
    governance: {
      provenance: { updated_by: writer },
      ...(lifecycle && { lifecycle }),
    },
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
  /** Whether deleting a dreamed fact or entity also deletes the relationships that link it. */
  deleteLinkedRelationships: boolean;
  backingIndex?: string;
  refresh?: boolean;
  abortSignal?: AbortSignal;
}

/** Marks a KI as deleted via lifecycle tombstone without removing the document. */
export const softDeleteKi = async (
  esClient: ElasticsearchClient,
  options: SoftDeleteKiOptions
): Promise<{ id: string; deletedRelationshipIds: string[] }> => {
  const {
    aiIndexId,
    dest,
    kiId,
    writer,
    deleteLinkedRelationships,
    backingIndex,
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
  if (!isKiDeleted(revision.source)) {
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
  }

  const deletedRelationshipIds: string[] = [];
  const { type } = revision.source;
  if (deleteLinkedRelationships && typeof type === 'string' && isDreamedKiType(type)) {
    for (const relationshipId of await findLinkingRelationshipIds({
      esClient,
      dest,
      kiId,
      abortSignal,
    })) {
      try {
        await softDeleteKi(esClient, {
          aiIndexId,
          dest,
          kiId: relationshipId,
          writer,
          deleteLinkedRelationships: false,
          refresh,
          abortSignal,
        });
        deletedRelationshipIds.push(relationshipId);
      } catch (error) {
        if (!(error instanceof KiNotFoundError)) {
          throw error;
        }
      }
    }
  }

  return { id: kiId, deletedRelationshipIds };
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
