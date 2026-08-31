/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import { MAX_KI_TYPE_FILTER_COUNT, takeTopKiTypeCounts } from '../../common/ki_type_counts';
import type { KiListItem, ListKisResponse } from '../../common/http_api/knowledge_indicators';

const LENIENT_INDEX_OPTIONS = {
  ignore_unavailable: true,
  allow_no_indices: true,
} as const;

const KI_LIST_SOURCE_FIELDS = ['type', 'title'] as const;

interface KiDocumentSource {
  type?: string;
  title?: string;
}

interface KiSearchAggregations {
  all_kis: {
    doc_count: number;
    counts_by_type: {
      buckets: Array<{ key: string; doc_count: number }>;
    };
  };
}

export interface GetKisOptions {
  destValue: string;
  size: number;
  type?: string;
}

const toKiListItemFromHit = (hit: estypes.SearchHit<KiDocumentSource>): KiListItem | undefined => {
  const { _id: id, _index: index, _source: source } = hit;
  if (id === undefined) {
    return undefined;
  }

  const { type, title } = source ?? {};
  return {
    id,
    index,
    ...(type !== undefined ? { type } : {}),
    ...(title !== undefined ? { title } : {}),
  };
};

const buildKiListQuery = ({ type }: Pick<GetKisOptions, 'type'>) => {
  if (type === undefined) {
    return { match_all: {} };
  }

  return { bool: { filter: [{ term: { type } }] } };
};

export const getKis = async (
  esClient: ElasticsearchClient,
  { destValue, size, type }: GetKisOptions
): Promise<ListKisResponse> => {
  const response = await esClient.search<KiDocumentSource, KiSearchAggregations>({
    index: destValue,
    ...LENIENT_INDEX_OPTIONS,
    from: 0,
    size,
    track_total_hits: true,
    _source: [...KI_LIST_SOURCE_FIELDS],
    query: buildKiListQuery({ type }),
    sort: [{ '@timestamp': { order: 'desc', unmapped_type: 'date' } }, { _doc: { order: 'desc' } }],
    aggs: {
      all_kis: {
        global: {},
        aggs: {
          counts_by_type: {
            terms: {
              field: 'type',
              size: MAX_KI_TYPE_FILTER_COUNT,
              order: { _count: 'desc' },
            },
          },
        },
      },
    },
  });

  const kis = response.hits.hits
    .map(toKiListItemFromHit)
    .filter((item): item is KiListItem => item !== undefined);

  const total =
    typeof response.hits.total === 'number'
      ? response.hits.total
      : response.hits.total?.value ?? kis.length;

  const allKisAgg = response.aggregations?.all_kis;
  const buckets = allKisAgg?.counts_by_type?.buckets ?? [];
  const countsByType = takeTopKiTypeCounts(
    buckets.map(({ key, doc_count }) => ({ type: key, count: doc_count }))
  );
  const totalAll = allKisAgg?.doc_count ?? 0;

  return {
    kis,
    total,
    summary: {
      total: totalAll > 0 ? totalAll : total,
      counts_by_type: countsByType,
    },
  };
};
