/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { RELATIONSHIP_KI_TYPE } from '../../common/dreaming';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import { kiUri } from '../dreaming/ids';
import { isKiDeleted, type StoredKi } from './ki_revision';

const PAGE_SIZE = 500;

type RelationshipRevision = Pick<StoredKi, 'id' | 'governance'>;

/** The ids of the relationships that link a KI and are not deleted. */
export const findLinkingRelationshipIds = async ({
  esClient,
  dest,
  kiId,
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  dest: AiIndexDest;
  kiId: string;
  abortSignal?: AbortSignal;
}): Promise<string[]> => {
  const ids: string[] = [];
  let after: string | undefined;
  do {
    const response = await esClient.search<RelationshipRevision>(
      {
        index: dest.value,
        ignore_unavailable: true,
        size: PAGE_SIZE,
        sort: [{ id: 'asc' }],
        collapse: {
          field: 'id',
          inner_hits: {
            name: 'latest',
            size: 1,
            sort: [{ updated_at: 'desc' }],
            _source: ['id', 'governance.lifecycle.status'],
          },
        },
        _source: false,
        ...(after !== undefined && { search_after: [after] }),
        query: {
          bool: {
            filter: [
              { term: { type: RELATIONSHIP_KI_TYPE } },
              { term: { 'references.uri': kiUri(kiId) } },
            ],
          },
        },
      },
      { signal: abortSignal }
    );
    const { hits } = response.hits;
    for (const hit of hits) {
      const latest = hit.inner_hits?.latest?.hits.hits[0]?._source as
        | RelationshipRevision
        | undefined;
      if (latest?.id !== undefined && !isKiDeleted(latest)) {
        ids.push(latest.id);
      }
    }
    const last = hits.at(-1)?.sort?.[0];
    after = hits.length === PAGE_SIZE && typeof last === 'string' ? last : undefined;
  } while (after !== undefined);
  return ids;
};
