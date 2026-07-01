/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsAggregationContainer,
  AggregationsAggregate,
  AggregationsStringTermsAggregate,
  AggregationsStringTermsBucket,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';

/**
 * Mapped keyword fields that support terms aggregations in change history.
 * Only string-valued keyword paths are supported; numeric fields are rejected at parse time.
 */
export type ChangeHistoryAggregateField = 'user.name' | 'user.id' | 'event.action' | 'event.type';

/** Supported {@link ChangeHistoryAggregateField} values for facet queries and tests. */
export const CHANGE_HISTORY_AGGREGATE_FIELDS = [
  'user.name',
  'user.id',
  'event.action',
  'event.type',
] as const satisfies readonly ChangeHistoryAggregateField[];

/** Default aggregation name used by {@link buildFieldTermsAggregation}. */
export const FIELD_AGGREGATION_NAME = 'values';

export interface ChangeHistoryFieldBucket {
  /** Distinct field value for this bucket. */
  key: string;
  /** Number of matching change history documents. */
  docCount: number;
}

export interface GetChangeHistoryFieldAggregationOptions {
  /** Mapped keyword field to bucket on (`user.name`, `event.action`, etc.). */
  field: ChangeHistoryAggregateField;
  /** Additional filters merged with the standard object scope filters. */
  additionalFilters?: QueryDslQueryContainer[];
  /** Maximum number of distinct values to return. Defaults to `DEFAULT_FIELD_AGGREGATION_SIZE` (100). */
  size?: number;
}

/**
 * Result from a field terms aggregation scoped to an object's change history.
 */
export interface GetChangeHistoryFieldAggregationResult {
  field: ChangeHistoryAggregateField;
  buckets: ChangeHistoryFieldBucket[];
  /**
   * Elasticsearch {@link https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-terms-aggregation sum_other_doc_count}:
   * total **document** count in terms buckets omitted because {@link GetChangeHistoryFieldAggregationOptions.size}
   * was exceeded.
   */
  sumOtherDocCount: number;
}

export interface BuildFieldTermsAggregationOptions {
  field: ChangeHistoryAggregateField;
  size: number;
}

export interface ParseFieldAggregationOptions {
  field: ChangeHistoryAggregateField;
  aggregationName?: string;
}

export const buildFieldTermsAggregation = ({
  field,
  size,
}: BuildFieldTermsAggregationOptions): Record<string, AggregationsAggregationContainer> => ({
  [FIELD_AGGREGATION_NAME]: {
    terms: {
      field,
      size,
      order: { _count: 'desc' },
    },
  },
});

export const parseFieldAggregationResult = (
  aggregations: Record<string, AggregationsAggregate> | undefined,
  { field, aggregationName = FIELD_AGGREGATION_NAME }: ParseFieldAggregationOptions
): Pick<GetChangeHistoryFieldAggregationResult, 'buckets' | 'sumOtherDocCount'> => {
  const valuesAgg = aggregations?.[aggregationName];
  if (valuesAgg === undefined) {
    return { buckets: [], sumOtherDocCount: 0 };
  }

  if (!isStringTermsAggregate(valuesAgg)) {
    throw new Error(
      `Expected string terms aggregation for field [${field}], got unexpected aggregation shape`
    );
  }

  return {
    buckets: valuesAgg.buckets.map((bucket) => toFieldBucket(bucket, field)),
    sumOtherDocCount: valuesAgg.sum_other_doc_count ?? 0,
  };
};

const isStringTermsAggregate = (
  aggregate: AggregationsAggregate
): aggregate is AggregationsStringTermsAggregate => {
  const candidate = aggregate as AggregationsStringTermsAggregate;
  return (
    typeof candidate.sum_other_doc_count === 'number' &&
    typeof candidate.doc_count_error_upper_bound === 'number' &&
    Array.isArray(candidate.buckets)
  );
};

const toFieldBucket = (
  bucket: AggregationsStringTermsBucket,
  field: ChangeHistoryAggregateField
): ChangeHistoryFieldBucket => {
  const key = bucket.key;
  if (typeof key !== 'string' || key.length === 0) {
    throw new Error(`Expected string bucket key for keyword field [${field}], got [${typeof key}]`);
  }

  return { key, docCount: bucket.doc_count };
};
