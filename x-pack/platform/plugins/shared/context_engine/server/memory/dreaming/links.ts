/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import { LONG_TERM_MEMORY_INDEX, MEMORY_ATTRIBUTES } from '../../../common/memory';
import type { StoredMemoryDocument } from '../memory_document';
import { updateMemoryProvenance } from '../memory_document';
import { buildActiveLongTermFilter } from './candidates';
import type { DreamApplyContext } from './long_term_types';
import { readAttribute } from './long_term_types';
import { buildRelationshipFields, isEndReference, isRelationshipEnd } from './relationship_type';

export const LINKS_PER_ROUND = 100;
/** Each round moves or expires the links it finds, so the next round finds the rest. */
export const MAX_LINK_UPDATE_ROUNDS = 10;

export interface StoredLink {
  id: string;
  document: StoredMemoryDocument;
  seqNo: number;
  primaryTerm: number;
}

const linksOf = (ids: string[]): QueryDslQueryContainer => ({
  bool: {
    should: [
      { terms: { [`attributes.${MEMORY_ATTRIBUTES.relationshipFromId}`]: ids } },
      { terms: { [`attributes.${MEMORY_ATTRIBUTES.relationshipToId}`]: ids } },
    ],
    minimum_should_match: 1,
  },
});

/** Live relationships in the space that start or end at one of the ids. */
export const findLinks = async ({
  esClient,
  spaceId,
  ids,
  now,
  size,
  signal,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  ids: string[];
  now: string;
  size: number;
  signal?: AbortSignal;
}): Promise<StoredLink[]> => {
  if (ids.length === 0) {
    return [];
  }
  const response = await esClient.search<StoredMemoryDocument>(
    {
      index: LONG_TERM_MEMORY_INDEX,
      ignore_unavailable: true,
      allow_no_indices: true,
      size,
      seq_no_primary_term: true,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            ...buildActiveLongTermFilter({ spaceId, types: ['memory.relationship'], now }),
            linksOf(ids),
          ],
        },
      },
      sort: [{ updated_at: 'desc' as const }],
    },
    { signal }
  );
  return response.hits.hits.flatMap(({ _id: id, _source: document, _seq_no, _primary_term }) =>
    id && document && _seq_no !== undefined && _primary_term !== undefined
      ? [{ id, document, seqNo: _seq_no, primaryTerm: _primary_term }]
      : []
  );
};

export interface UpdateLinksParams {
  esClient: ElasticsearchClient;
  spaceId: string;
  /** The end that was superseded, outdated or tombstoned. */
  endId: string;
  /** The memory that superseded the end. Unset when the end is gone. */
  replacement?: StoredMemoryDocument;
  getLiveMemory: (id: string) => Promise<StoredMemoryDocument | undefined>;
  context: DreamApplyContext;
  logger: Logger;
}

/**
 * Keeps relationships valid after one of their ends changed: they move to the memory that
 * superseded the end, or expire with it. Returns how many were updated.
 */
export const updateLinksOfEnd = async ({
  esClient,
  spaceId,
  endId,
  replacement,
  getLiveMemory,
  context: { now, writer },
  logger,
}: UpdateLinksParams): Promise<number> => {
  const outdate = (link: StoredMemoryDocument): StoredMemoryDocument => ({
    ...link,
    expires_at: now,
    updated_at: now,
    governance: updateMemoryProvenance(link.governance, writer, false),
  });

  const repoint = async (link: StoredMemoryDocument): Promise<StoredMemoryDocument> => {
    const fromId = readAttribute(link, MEMORY_ATTRIBUTES.relationshipFromId);
    const toId = readAttribute(link, MEMORY_ATTRIBUTES.relationshipToId);
    const relation = readAttribute(link, MEMORY_ATTRIBUTES.relationshipRelation);
    if (!replacement || !fromId || !toId || !relation) {
      return outdate(link);
    }
    const otherId = fromId === endId ? toId : fromId;
    const other = otherId === endId ? replacement : await getLiveMemory(otherId);
    if (!other || !isRelationshipEnd(other) || other.id === replacement.id) {
      return outdate(link);
    }
    const [from, to] = fromId === endId ? [replacement, other] : [other, replacement];
    const fields = buildRelationshipFields({
      from,
      relation,
      to,
      description: link.description ?? '',
    });
    return {
      ...link,
      title: fields.title,
      content: fields.content,
      updated_at: now,
      references: [
        ...(fields.references ?? []),
        ...(link.references ?? []).filter((reference) => !isEndReference(reference)),
      ],
      attributes: {
        ...link.attributes,
        ...fields.attributes,
        [MEMORY_ATTRIBUTES.key]: fields.key,
      },
      governance: updateMemoryProvenance(link.governance, writer, false),
    };
  };

  let updated = 0;
  for (let round = 0; round < MAX_LINK_UPDATE_ROUNDS; round++) {
    const links = await findLinks({ esClient, spaceId, ids: [endId], now, size: LINKS_PER_ROUND });
    let conflicts = 0;
    for (const { id, document, seqNo, primaryTerm } of links) {
      try {
        await esClient.index({
          index: LONG_TERM_MEMORY_INDEX,
          id,
          document: await repoint(document),
          if_seq_no: seqNo,
          if_primary_term: primaryTerm,
          refresh: 'wait_for',
        });
        updated++;
      } catch (error) {
        if (!isResponseError(error) || error.statusCode !== 409) {
          throw error;
        }
        conflicts++;
      }
    }
    if (links.length < LINKS_PER_ROUND && conflicts === 0) {
      return updated;
    }
  }
  logger.warn(
    `Memory '${endId}' still has relationships after ${MAX_LINK_UPDATE_ROUNDS} rounds of updates; they keep pointing at it`
  );
  return updated;
};
