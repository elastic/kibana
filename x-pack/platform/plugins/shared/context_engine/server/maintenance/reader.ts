/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import type {
  MsearchRequestItem,
  QueryDslQueryContainer,
  SearchHit,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  DREAMING_MEMORY_KI_TYPES,
  ENTITY_TYPE_PREFIX,
  FACT_TYPE_PREFIX,
  RELATIONSHIP_KI_TYPE,
} from '../../common/dreaming';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import { buildAiIndexSpaceFilter } from '../../common/space_filter';
import { MAINTENANCE_CHANGED_PAGE_SIZE } from '../../common/step_types/gather_maintenance';
import { baseContent } from '../dreaming/access_patterns';
import { kindOf, type DreamedKi } from '../dreaming/dreamed_ki';

const TERMS_CHUNK_SIZE = 1000;
const MSEARCH_CHUNK_SIZE = 50;
const NEIGHBOR_OVERFETCH = 3;
const MAX_NEIGHBOR_QUERY_LENGTH = 2000;
const MAX_CITING = 2000;

const LATEST = {
  name: 'latest',
  size: 1,
  sort: [{ updated_at: { order: 'desc' as const, unmapped_type: 'date' as const } }],
};

type Hit = SearchHit<unknown>;

const latestOf = (hits: readonly Hit[]): DreamedKi[] =>
  hits.flatMap((hit) => {
    const latest = hit.inner_hits?.latest?.hits.hits[0]?._source as DreamedKi | undefined;
    return typeof latest?.id === 'string' ? [latest] : [];
  });

const itemTypes: QueryDslQueryContainer = {
  bool: {
    should: [{ prefix: { type: FACT_TYPE_PREFIX } }, { prefix: { type: ENTITY_TYPE_PREFIX } }],
    minimum_should_match: 1,
  },
};

const kindTypes = (kind: 'fact' | 'entity'): QueryDslQueryContainer => ({
  prefix: { type: kind === 'fact' ? FACT_TYPE_PREFIX : ENTITY_TYPE_PREFIX },
});

export interface ChangedPage {
  /** The newest revision of each fact, entity, relationship and memory changed after the cursor. */
  kis: DreamedKi[];
  /** Where the next run continues, when this page was full. */
  resume?: { from: string; afterId: string };
}

/** What memory maintenance reads from an AI index. */
export interface MaintenanceReader {
  changedSince: (since: string, afterId: string | undefined) => Promise<ChangedPage>;
  /** The newest revision of each KI, deleted or not, visible in any space. */
  latestByIds: (ids: readonly string[]) => Promise<Map<string, DreamedKi>>;
  /** The newest revision of each fact and entity, or relationship, citing one of the URIs. */
  citing: (uris: readonly string[], kind: 'items' | 'relationships') => Promise<DreamedKi[]>;
  /** The newest revision of up to `size` facts and entities with an id greater than `afterId`. */
  sweep: (afterId: string | undefined, size: number) => Promise<DreamedKi[]>;
  /** The newest revisions of the items most similar to each, by id; may include deleted ones. */
  similar: (items: readonly DreamedKi[], size: number) => Promise<Map<string, DreamedKi[]>>;
}

const neighborText = ({ title, content }: DreamedKi): string =>
  [title, baseContent(content)]
    .filter(Boolean)
    .join('\n')
    .slice(0, MAX_NEIGHBOR_QUERY_LENGTH);

export const createMaintenanceReader = ({
  esClient,
  dest,
  spaceId,
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  dest: AiIndexDest;
  spaceId: string;
  abortSignal?: AbortSignal;
}): MaintenanceReader => {
  const spaceFilter = buildAiIndexSpaceFilter(spaceId);
  const search = async (body: Record<string, unknown>): Promise<Hit[]> => {
    const response = await esClient.search(
      { index: dest.value, ignore_unavailable: true, _source: false, ...body },
      { signal: abortSignal }
    );
    return response.hits.hits;
  };

  const similarBy = async (
    items: readonly DreamedKi[],
    size: number,
    match: (ki: DreamedKi) => QueryDslQueryContainer
  ): Promise<Array<Hit[] | undefined>> => {
    const results: Array<Hit[] | undefined> = [];
    for (const part of chunk(items, MSEARCH_CHUNK_SIZE)) {
      const searches: MsearchRequestItem[] = part.flatMap((ki) => [
        { index: dest.value, ignore_unavailable: true },
        {
          size: size * NEIGHBOR_OVERFETCH,
          _source: false,
          collapse: { field: 'id', inner_hits: LATEST },
          query: {
            bool: {
              must: [match(ki)],
              filter: [kindTypes(kindOf(ki) ?? 'fact'), spaceFilter],
              must_not: [{ term: { id: ki.id } }],
            },
          },
        },
      ]);
      const { responses } = await esClient.msearch({ searches }, { signal: abortSignal });
      for (const response of responses) {
        results.push('error' in response ? undefined : response.hits.hits);
      }
    }
    return results;
  };

  return {
    changedSince: async (since, afterId) => {
      const hits = await search({
        size: MAINTENANCE_CHANGED_PAGE_SIZE,
        sort: [{ updated_at: 'asc' }, { id: 'asc' }],
        collapse: { field: 'id', inner_hits: LATEST },
        _source: ['id', 'updated_at'],
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [
                    itemTypes,
                    { term: { type: RELATIONSHIP_KI_TYPE } },
                    { terms: { type: [...DREAMING_MEMORY_KI_TYPES] } },
                  ],
                  minimum_should_match: 1,
                },
              },
              {
                bool: {
                  should: [
                    { range: { updated_at: { gt: since } } },
                    ...(afterId
                      ? [
                          {
                            bool: {
                              filter: [
                                { term: { updated_at: since } },
                                { range: { id: { gt: afterId } } },
                              ],
                            },
                          },
                        ]
                      : []),
                  ],
                  minimum_should_match: 1,
                },
              },
              spaceFilter,
            ],
          },
        },
      });
      const last = hits.at(-1)?._source as { id?: string; updated_at?: string } | undefined;
      return {
        kis: latestOf(hits),
        ...(hits.length === MAINTENANCE_CHANGED_PAGE_SIZE &&
          last?.updated_at !== undefined &&
          last.id !== undefined && { resume: { from: last.updated_at, afterId: last.id } }),
      };
    },

    latestByIds: async (ids) => {
      const found = new Map<string, DreamedKi>();
      for (const part of chunk([...new Set(ids)], TERMS_CHUNK_SIZE)) {
        const hits = await search({
          size: part.length,
          collapse: { field: 'id', inner_hits: LATEST },
          query: { bool: { filter: [{ terms: { id: part } }] } },
        });
        for (const ki of latestOf(hits)) {
          found.set(ki.id, ki);
        }
      }
      return found;
    },

    citing: async (uris, kind) => {
      const found = new Map<string, DreamedKi>();
      for (const part of chunk([...new Set(uris)], TERMS_CHUNK_SIZE)) {
        const hits = await search({
          size: MAX_CITING,
          collapse: { field: 'id', inner_hits: LATEST },
          query: {
            bool: {
              filter: [
                kind === 'items' ? itemTypes : { term: { type: RELATIONSHIP_KI_TYPE } },
                { terms: { 'references.uri': part } },
                spaceFilter,
              ],
            },
          },
        });
        for (const ki of latestOf(hits)) {
          found.set(ki.id, ki);
        }
      }
      return [...found.values()];
    },

    sweep: async (afterId, size) =>
      latestOf(
        await search({
          size,
          sort: [{ id: 'asc' }],
          collapse: { field: 'id', inner_hits: LATEST },
          ...(afterId && { search_after: [afterId] }),
          query: { bool: { filter: [itemTypes, spaceFilter] } },
        })
      ),

    similar: async (items, size) => {
      const semantic = await similarBy(items, size, (ki) => ({
        semantic: { field: 'content.semantic', query: neighborText(ki) },
      }));
      const missing = items.filter((_, position) => semantic[position] === undefined);
      const lexical = missing.length
        ? await similarBy(missing, size, (ki) => ({
            multi_match: { query: neighborText(ki), fields: ['title', 'content'] },
          }))
        : [];
      const neighbors = new Map<string, DreamedKi[]>();
      let fallback = 0;
      items.forEach((ki, position) => {
        const hits = semantic[position] ?? lexical[fallback++] ?? [];
        neighbors.set(ki.id, latestOf(hits));
      });
      return neighbors;
    },
  };
};