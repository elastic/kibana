/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsAggregate,
  AggregationsAggregationContainer,
  SearchRequest,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-episodes-ui/constants';

export interface BuildSeriesGroupingValuesQueryOptions {
  ruleId: string;
  /** Group hashes returned by the summary query. */
  groupHashes: string[];
  /** Field names from `rule.grouping.fields` to project. */
  groupingFields: readonly string[];
  /** Visible window start (epoch ms). */
  gteMs: number;
  /** Visible window end (epoch ms). */
  lteMs: number;
}

const toIsoUtc = (ms: number) => new Date(ms).toISOString();

const groupHashAggName = 'by_group';

/**
 * Builds a DSL search that returns one keyword value per (`group_hash` × field)
 * for a rule. Used to render labels like `host=web-01` in the heatmap section.
 *
 * Why DSL and not ES|QL: the rule executor writes the source row into a
 * `flattened` `data` field. ES|QL exposes flattened fields as a single
 * `unsupported`-typed column with no subfield access. DSL terms aggregations
 * on `data.<field>` work because flattened sub-fields are aggregatable as
 * keyword tokens.
 */
export const buildSeriesGroupingValuesQuery = ({
  ruleId,
  groupHashes,
  groupingFields,
  gteMs,
  lteMs,
}: BuildSeriesGroupingValuesQueryOptions): SearchRequest => {
  const fieldAggs = groupingFields.reduce<Record<string, AggregationsAggregationContainer>>(
    (acc, field) => {
      acc[field] = { terms: { field: `data.${field}`, size: 1 } };
      return acc;
    },
    {}
  );

  return {
    index: ALERT_EVENTS_DATA_STREAM,
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: [
          { term: { 'rule.id': ruleId } },
          { term: { type: 'alert' } },
          { terms: { group_hash: groupHashes } },
          {
            range: {
              '@timestamp': {
                gte: toIsoUtc(gteMs),
                lte: toIsoUtc(lteMs),
              },
            },
          },
        ],
      },
    },
    aggs: {
      [groupHashAggName]: {
        terms: { field: 'group_hash', size: Math.max(groupHashes.length, 1) },
        aggs: fieldAggs,
      },
    },
  };
};

interface TermsBucket {
  key: string;
  doc_count: number;
}

interface TermsAggResult {
  buckets: TermsBucket[];
}

interface ByGroupBucket extends TermsBucket {
  [field: string]: TermsAggResult | string | number;
}

/**
 * Result map: `{ [group_hash]: { [field]: value | null } }`. Fields with no
 * bucket are mapped to `null` so the consumer can distinguish "no value" from
 * "field not requested".
 */
export type SeriesGroupingValuesByHash = Record<string, Record<string, string | null>>;

export const parseSeriesGroupingValuesResponse = (
  response: SearchResponse<unknown, Record<string, AggregationsAggregate>>,
  groupingFields: readonly string[]
): SeriesGroupingValuesByHash => {
  const out: SeriesGroupingValuesByHash = {};
  const byGroup = response.aggregations?.[groupHashAggName] as
    | { buckets?: ByGroupBucket[] }
    | undefined;
  const buckets = byGroup?.buckets ?? [];

  for (const bucket of buckets) {
    const fields: Record<string, string | null> = {};
    for (const field of groupingFields) {
      const fieldAgg = bucket[field] as TermsAggResult | undefined;
      const firstBucket = fieldAgg?.buckets?.[0];
      fields[field] = firstBucket?.key ?? null;
    }
    out[bucket.key] = fields;
  }

  return out;
};
