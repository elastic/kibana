/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { MAX_KI_TYPE_FILTER_COUNT, takeTopKiTypeCounts } from '../../common/ki_type_counts';
import type { KiTypeCount } from '../../common/http_api/ai_indices';
import type { KiListItem, ListKisResponse } from '../../common/http_api/knowledge_indicators';

const LENIENT_INDEX_OPTIONS = {
  ignore_unavailable: true,
  allow_no_indices: true,
} as const;

const KI_LIST_SOURCE_FIELDS = [
  'type',
  'title',
  'attributes.source',
  'attributes.source_label',
  'attributes.version',
] as const;

interface KiDocumentSource {
  type?: string;
  title?: string;
  attributes?: {
    source?: string;
    source_label?: string;
    version?: string | number;
  };
}

interface TermsAggregationBucket {
  key: string;
  doc_count: number;
}

interface KiSearchAggregations {
  all_kis: {
    doc_count: number;
    counts_by_type: {
      buckets: TermsAggregationBucket[];
    };
  };
}

export interface GetKisOptions {
  destValue: string;
  from: number;
  size: number;
  type?: string;
}

const readAttributeString = (value: string | number | undefined): string | undefined => {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
};

const toKiListItem = (kiId: string, source: KiDocumentSource): KiListItem | undefined => {
  const type = source.type;
  const title = source.title;
  if (type === undefined || title === undefined) {
    return undefined;
  }

  const sourceLabel =
    readAttributeString(source.attributes?.source_label) ??
    readAttributeString(source.attributes?.source);
  const rawVersion = readAttributeString(source.attributes?.version);
  const version =
    rawVersion !== undefined
      ? rawVersion.startsWith('v')
        ? rawVersion
        : `v${rawVersion}`
      : undefined;

  return {
    ki_id: kiId,
    type,
    title,
    ...(sourceLabel !== undefined ? { source_label: sourceLabel } : {}),
    ...(version !== undefined ? { version } : {}),
  };
};

const buildKiListQuery = ({ type }: Pick<GetKisOptions, 'type'>) => {
  if (type === undefined) {
    return { match_all: {} };
  }

  return { bool: { filter: [{ term: { type } }] } };
};

const isTermsAggregationBucket = (value: unknown): value is TermsAggregationBucket =>
  typeof value === 'object' &&
  value !== null &&
  'key' in value &&
  'doc_count' in value &&
  typeof value.key === 'string' &&
  typeof value.doc_count === 'number';

const parseCountsByTypeBuckets = (buckets: TermsAggregationBucket[] | undefined): KiTypeCount[] => {
  if (buckets === undefined) {
    return [];
  }

  const counts = buckets.flatMap((bucket) =>
    isTermsAggregationBucket(bucket) ? [{ type: bucket.key, count: bucket.doc_count }] : []
  );

  return takeTopKiTypeCounts(counts);
};

const parseAllKisAggregation = (
  aggregations: KiSearchAggregations | undefined
): { totalAll: number; countsByType: KiTypeCount[] } => {
  const allKisAgg = aggregations?.all_kis;
  return {
    totalAll: allKisAgg?.doc_count ?? 0,
    countsByType: parseCountsByTypeBuckets(allKisAgg?.counts_by_type?.buckets),
  };
};

export const getKis = async (
  esClient: ElasticsearchClient,
  { destValue, from, size, type }: GetKisOptions
): Promise<ListKisResponse> => {
  const response = await esClient.search<KiDocumentSource, KiSearchAggregations>({
    index: destValue,
    ...LENIENT_INDEX_OPTIONS,
    from,
    size,
    track_total_hits: true,
    _source: [...KI_LIST_SOURCE_FIELDS],
    query: buildKiListQuery({ type }),
    sort: [{ '@timestamp': { order: 'desc' } }, { _doc: { order: 'desc' } }],
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

  const kis = response.hits.hits.flatMap((hit) => {
    if (hit._source === undefined || hit._id === undefined) {
      return [];
    }
    const item = toKiListItem(hit._id, hit._source);
    return item !== undefined ? [item] : [];
  });

  const total =
    typeof response.hits.total === 'number'
      ? response.hits.total
      : response.hits.total?.value ?? kis.length;

  const { totalAll, countsByType } = parseAllKisAggregation(response.aggregations);

  return {
    kis,
    total,
    total_all: totalAll > 0 ? totalAll : total,
    counts_by_type: countsByType,
  };
};
