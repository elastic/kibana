/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry from 'p-retry';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { DREAMING_EXCLUDED_KI_TYPES } from '../../common/dreaming';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import { KiConflictError } from '../ai_indices/errors';
import {
  findKiRevision,
  isKiDeleted,
  putKiRevision,
  type KiRevision,
  type KiWriter,
  type StoredKi,
} from '../ai_indices/ki_revision';
import { storedDocument } from './apply';
import type { DreamedKi } from './dreamed_ki';
import { isVisibleInSpace } from './permissions';

const WRITE_CONFLICT_RETRIES = 3;
const INACTIVE_STATUSES: ReadonlySet<string> = new Set(['deleted', 'verification_failed']);

/** The ES query for KIs whose type passes the filters, leaving out the excluded types. */
export const kiTypeFilterQuery = (filters: readonly string[]): QueryDslQueryContainer => ({
  bool: {
    should: filters.map((filter) =>
      filter.endsWith('.*') ? { prefix: { type: filter.slice(0, -1) } } : { term: { type: filter } }
    ),
    minimum_should_match: 1,
    must_not: [{ terms: { type: [...DREAMING_EXCLUDED_KI_TYPES] } }],
  },
});

/** Whether a stored KI can be read and changed now: active, not expired, visible in the space. */
export const isActiveKi = (
  ki: Pick<DreamedKi, 'permissions'> & StoredKi,
  spaceId: string,
  now: Date = new Date()
): boolean => {
  const status = ki.governance?.lifecycle?.status;
  if (status !== undefined && INACTIVE_STATUSES.has(status)) {
    return false;
  }
  const expiresAt = typeof ki.expires_at === 'string' ? Date.parse(ki.expires_at) : NaN;
  if (!Number.isNaN(expiresAt) && expiresAt <= now.getTime()) {
    return false;
  }
  return isVisibleInSpace(ki.permissions, spaceId);
};

/** The current revision of a KI, when it is active and visible in the space. */
export const readActiveKi = async ({
  esClient,
  aiIndexId,
  dest,
  spaceId,
  kiId,
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  aiIndexId: string;
  dest: AiIndexDest;
  spaceId: string;
  kiId: string;
  abortSignal?: AbortSignal;
}): Promise<{ ki: DreamedKi; revision: KiRevision } | undefined> => {
  const revision = await findKiRevision({
    esClient,
    aiIndexId,
    dest,
    kiId,
    includeSource: true,
    abortSignal,
  });
  const source = revision?.source as DreamedKi | undefined;
  if (!revision || !source || isKiDeleted(source) || !isActiveKi(source, spaceId)) {
    return undefined;
  }
  return { ki: { ...source, id: kiId }, revision };
};

/** Reads KIs by id, in order, leaving out those that are not active or not visible. */
export const readActiveKis = async ({
  ids,
  ...params
}: Omit<Parameters<typeof readActiveKi>[0], 'kiId'> & { ids: readonly string[] }): Promise<
  DreamedKi[]
> => {
  const kis: DreamedKi[] = [];
  for (const kiId of new Set(ids)) {
    const found = await readActiveKi({ ...params, kiId });
    if (found) {
      kis.push(found.ki);
    }
  }
  return kis;
};

export type KiWriteOutcome =
  | { status: 'created' | 'updated'; document: StoredKi }
  | { status: 'skipped'; reason: string };

/**
 * Writes a KI from its current revision, retrying on a concurrent write. `build` returns the
 * document to store, or why to leave the KI alone. A dry run only builds it.
 */
export const writeKi = async ({
  esClient,
  aiIndexId,
  dest,
  spaceId,
  writer,
  kiId,
  build,
  dryRun = false,
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  aiIndexId: string;
  dest: AiIndexDest;
  spaceId: string;
  writer: KiWriter;
  kiId: string;
  build: (
    current: DreamedKi | undefined
  ) => { document: Omit<DreamedKi, 'governance'> } | { skip: string };
  dryRun?: boolean;
  abortSignal?: AbortSignal;
}): Promise<KiWriteOutcome> =>
  pRetry(
    async (): Promise<KiWriteOutcome> => {
      const revision = await findKiRevision({
        esClient,
        aiIndexId,
        dest,
        kiId,
        includeSource: true,
        abortSignal,
      });
      const source = revision?.source as DreamedKi | undefined;
      if (source && !isVisibleInSpace(source.permissions, spaceId)) {
        return { status: 'skipped', reason: 'it is not visible in this space' };
      }
      const current = source && !isKiDeleted(source) ? { ...source, id: kiId } : undefined;
      const built = build(current);
      if ('skip' in built) {
        return { status: 'skipped', reason: built.skip };
      }
      const document = storedDocument(built.document, kiId, current, writer);
      if (!dryRun) {
        await putKiRevision({
          esClient,
          aiIndexId,
          dest,
          kiId,
          document,
          existing: dest.type === 'data_stream' ? undefined : revision,
          failIfExists: revision === undefined,
          refresh: true,
          abortSignal,
        });
      }
      return { status: current ? 'updated' : 'created', document };
    },
    {
      retries: WRITE_CONFLICT_RETRIES,
      onFailedAttempt: (error) => {
        if (!(error instanceof KiConflictError)) {
          throw error;
        }
      },
    }
  );
