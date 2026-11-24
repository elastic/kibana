/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ENTITY_TYPE_PREFIX } from '../../common/dreaming';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import { isKiDeleted } from '../ai_indices/ki_revision';
import { kindOf, type DreamedKi } from './dreamed_ki';
import { kiUri } from './ids';
import { isVisibleInSpace } from './permissions';
import type { DreamingOperation, UpsertEntityOperation } from './resolve_change_set';

/** How many merges deep a chain of `supersedes` links is followed. */
const MAX_SUPERSEDES_HOPS = 5;
const MAX_SUPERSEDING_CANDIDATES = 10;

export const supersedes = (ki: Pick<DreamedKi, 'references'>, kiId: string): boolean =>
  (ki.references ?? []).some(
    ({ uri, relation }) => relation === 'supersedes' && uri === kiUri(kiId)
  );

/** The newest revision of each entity that cites a KI, whether or not it still `supersedes` it. */
export const findEntitiesCiting = async ({
  esClient,
  dest,
  kiId,
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  dest: AiIndexDest;
  kiId: string;
  abortSignal?: AbortSignal;
}): Promise<DreamedKi[]> => {
  const response = await esClient.search<DreamedKi>(
    {
      index: dest.value,
      ignore_unavailable: true,
      size: MAX_SUPERSEDING_CANDIDATES,
      sort: [{ updated_at: { order: 'desc', unmapped_type: 'date' } }],
      collapse: {
        field: 'id',
        inner_hits: { name: 'latest', size: 1, sort: [{ updated_at: 'desc' }] },
      },
      _source: false,
      query: {
        bool: {
          filter: [
            { prefix: { type: ENTITY_TYPE_PREFIX } },
            { term: { 'references.uri': kiUri(kiId) } },
          ],
        },
      },
    },
    { signal: abortSignal }
  );
  return response.hits.hits.flatMap((hit) => {
    const latest = hit.inner_hits?.latest?.hits.hits[0]?._source as DreamedKi | undefined;
    return typeof latest?.id === 'string' ? [latest] : [];
  });
};

export interface SupersededLookup {
  /** The newest revision of a KI, deleted or not; undefined when it was never written. */
  findKi: (kiId: string) => Promise<DreamedKi | undefined>;
  /** The newest revision of each entity citing a KI. */
  findCiting: (kiId: string) => Promise<DreamedKi[]>;
  spaceId: string;
}

/**
 * The live entity that took over a deleted one through `supersedes` links, following merges of
 * merges; undefined when the entity is live, was never written, or nothing took it over.
 */
export const findSupersedingEntity = async (
  kiId: string,
  { findKi, findCiting, spaceId }: SupersededLookup
): Promise<DreamedKi | undefined> => {
  const current = await findKi(kiId);
  if (!current || !isKiDeleted(current)) {
    return undefined;
  }
  let absorbedId = kiId;
  const seen = new Set([kiId]);
  for (let hop = 0; hop < MAX_SUPERSEDES_HOPS; hop++) {
    const successor = (await findCiting(absorbedId)).find(
      (candidate) =>
        !seen.has(candidate.id) &&
        kindOf(candidate) === 'entity' &&
        supersedes(candidate, absorbedId) &&
        isVisibleInSpace(candidate.permissions, spaceId)
    );
    if (!successor) {
      return undefined;
    }
    if (!isKiDeleted(successor)) {
      return successor;
    }
    absorbedId = successor.id;
    seen.add(absorbedId);
  }
  return undefined;
};

/** The model never saw the survivor, so only a sighting is recorded on it: its text stays. */
const redirectTo = (
  operation: UpsertEntityOperation,
  survivor: DreamedKi
): UpsertEntityOperation => {
  const {
    description: _description,
    content: _content,
    accessPatterns: _patterns,
    ...rest
  } = operation;
  const survivorAttributes = survivor.attributes ?? {};
  return {
    ...rest,
    id: survivor.id,
    type: survivor.type.slice(ENTITY_TYPE_PREFIX.length),
    title: survivor.title,
    attributes: Object.fromEntries(
      Object.entries(operation.attributes).filter(([key]) => !(key in survivorAttributes))
    ),
  };
};

/** Points each entity write at the live entity that superseded it, when one did. */
export const redirectSupersededEntities = async (
  operations: readonly DreamingOperation[],
  lookup: SupersededLookup
): Promise<DreamingOperation[]> => {
  const redirected: DreamingOperation[] = [];
  for (const operation of operations) {
    if (operation.op !== 'upsert_entity') {
      redirected.push(operation);
      continue;
    }
    const survivor = await findSupersedingEntity(operation.id, lookup);
    redirected.push(survivor ? redirectTo(operation, survivor) : operation);
  }
  return redirected;
};
