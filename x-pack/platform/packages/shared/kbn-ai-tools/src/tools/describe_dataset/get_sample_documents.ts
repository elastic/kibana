/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MappingRuntimeFields,
  QueryDslFieldAndFormat,
  QueryDslQueryContainer,
  SearchHit,
} from '@elastic/elasticsearch/lib/api/types';
import { esql, type ComposerQuery, type ComposerQueryTagHole } from '@elastic/esql';
import type { ESQLAstExpression } from '@elastic/esql/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { kqlQuery, dateRangeQuery } from '@kbn/es-query';
import { castArray } from 'lodash';
import { randomUUID } from 'crypto';
import {
  parseEsqlSourceDocuments,
  getEsqlDocumentId,
} from '../../utils/parse_esql_source_documents';
import { esqlTimeRange, TIME_FIELD } from '../../utils/esql_time_range';

const SAMPLE_COUNT_VARIANCE_RATIO = 25;
const SAMPLE_COUNT_MARGIN_DEVIATIONS = 3;
const SAMPLE_ORDER_COLUMN = '_sample_order';
const ESQL_VIEW_PREFIX = '$.';

const isEsqlView = (index: string) => index.startsWith(ESQL_VIEW_PREFIX);

type WhereCondition = ESQLAstExpression & ComposerQueryTagHole;

interface GetSampleDocumentsEsqlParams {
  esClient: ElasticsearchClient;
  index: string | string[];
  start: number;
  end: number;
  kql?: string;
  size?: number;
  sampleSize?: number;
  whereCondition?: WhereCondition;
  /**
   * Controls the ES|QL `SET unmapped_fields=...` prefix:
   * - `'LOAD'` reads unmapped fields from `_source` (used by the entity-filter
   *   sampling arm to query source-only fields).
   * - `'NULLIFY'` nullifies unmapped fields so full-text-search functions like
   *   `MATCH_PHRASE` skip them silently instead of raising
   *   `verification_exception: Unknown column [...]`.
   * Omitted means ES|QL uses its default unmapped-field behavior (any direct
   * reference to an unmapped column is a verification error).
   */
  unmappedFields?: 'LOAD' | 'NULLIFY';
  /**
   * Optional Query DSL filter clauses forwarded as the ES|QL `_query` request's
   * `filter` parameter. ES applies these at the request layer (before the ES|QL
   * pipeline runs), so callers can pass raw fixture-style DSL (`term`, `terms`,
   * `match`, `match_phrase`, `exists`, `bool { should, minimum_should_match }`,
   * ...) without translating to KQL. On ES|QL views a request-level `filter`
   * blocks `SAMPLE` / `LIMIT` / `STATS` pushdown (see `esqlTimeRange`).
   */
  dslFilter?: QueryDslQueryContainer | QueryDslQueryContainer[];
  abortSignal: AbortSignal;
}

interface GetSampleDocumentsEsqlResponse {
  hits: Array<SearchHit<Record<string, unknown>>>;
  total: number;
}

export function getSampleDocuments({
  esClient,
  index,
  start,
  end,
  kql,
  filter,
  size = 1000,
  fields = [
    {
      field: '*',
      include_unmapped: true,
    },
  ],
  _source = false,
  timeout = '5s',
  runtime_mappings,
}: {
  esClient: ElasticsearchClient;
  index: string | string[];
  start: number;
  end: number;
  kql?: string;
  size?: number;
  filter?: QueryDslQueryContainer | QueryDslQueryContainer[];
  fields?: Array<QueryDslFieldAndFormat | string>;
  _source?: boolean;
  timeout?: string;
  runtime_mappings?: MappingRuntimeFields;
}) {
  return esClient
    .search<Record<string, any>>({
      index,
      size,
      track_total_hits: true,
      timeout,
      runtime_mappings,
      query: {
        bool: {
          must: [...kqlQuery(kql), ...dateRangeQuery(start, end), ...castArray(filter ?? [])],
          should: [
            {
              function_score: {
                functions: [
                  {
                    random_score: {},
                  },
                ],
              },
            },
          ],
        },
      },
      sort: {
        _score: {
          order: 'desc',
        },
      },
      _source,
      fields,
    })
    .then((response) => ({
      hits: response.hits.hits as Array<SearchHit<Record<string, any>>>,
      total:
        typeof response.hits.total === 'number'
          ? response.hits.total!
          : response.hits.total?.value!,
    }));
}

/**
 * ES|QL-native companion to `getSampleDocuments` for callers that must sample
 * from remote clusters or external data sources where classic search APIs are
 * not available. The helper returns `_source`-backed hits instead of `fields`
 * hits, which keeps downstream document formatting compatible while avoiding
 * Query DSL.
 *
 * When `sampleSize` is provided, ES|QL has no `random_score` equivalent, and
 * `SAMPLE p` returns a varying number of rows in storage order. To preserve the
 * old random-sampling behavior, this first counts the matching population,
 * oversamples with `SAMPLE`, then has Elasticsearch keep `sampleSize` rows in
 * random order. The order is a salted hash of `@timestamp`, the only row key
 * views expose, so rows sharing a timestamp tie.
 *
 * `unmappedFields` emits `SET unmapped_fields="<mode>"` so ES|QL predicates
 * can evaluate source-only fields (`'LOAD'`, replaces the older fieldCaps +
 * runtime_mappings path for entity-filtered sampling) or silently nullify
 * unmapped columns (`'NULLIFY'`, required when the `WHERE` includes
 * `MATCH_PHRASE` / `MATCH` against fields that may not be mapped on every
 * backing index — DSL `match_phrase` no-matches missing fields, but bare
 * ES|QL full-text functions raise `verification_exception` instead).
 */
export async function getSampleDocumentsEsql({
  esClient,
  index,
  start,
  end,
  kql,
  size = 1000,
  sampleSize,
  whereCondition,
  unmappedFields,
  dslFilter,
  abortSignal,
}: GetSampleDocumentsEsqlParams): Promise<GetSampleDocumentsEsqlResponse> {
  const indices = Array.isArray(index) ? index : [index];
  const extraDslClauses = dslFilter ? castArray(dslFilter) : [];
  const filter = extraDslClauses.length > 0 ? { bool: { filter: extraDslClauses } } : undefined;

  const runQuery = (params: { query: string; drop_null_columns: true }) =>
    esClient.esql.query(
      { ...params, ...(filter ? { filter } : {}) },
      { signal: abortSignal }
    ) as unknown as Promise<ESQLSearchResponse>;

  const whereExpression = buildWhereExpression({ start, end, kql, whereCondition });
  const printQuery = (query: ComposerQuery) => {
    if (unmappedFields) {
      query.addSetCommand('unmapped_fields', unmappedFields);
    }
    return query.print('basic');
  };

  // Outer METADATA on a view is null-injected as an Eval between FROM and WHERE,
  // which makes QSTR/MATCH fail with "cannot be used after FROM".
  const hasView = indices.some(isEsqlView);
  const buildSourceQuery = () =>
    esql.from(indices, hasView ? undefined : ['_id', '_source']).where`${whereExpression}`;

  const buildQuery = ({ limit }: { limit: number }) => printQuery(buildSourceQuery().limit(limit));

  const buildSampleQuery = ({
    sampleProbability,
    limit,
  }: {
    sampleProbability: number;
    limit: number;
  }) => {
    let query = buildSourceQuery();
    if (sampleProbability < 1) {
      query = query.sample(sampleProbability);
    }
    const orderColumn = esql.col(SAMPLE_ORDER_COLUMN);
    const timeField = esql.col(TIME_FIELD);
    // Without the salt, the same documents would win the sort on every request.
    const salt = esql.str(randomUUID());

    return printQuery(
      query.pipe`EVAL ${orderColumn} = HASH("md5", CONCAT(${salt}, ${timeField}::string))`
        .sort(SAMPLE_ORDER_COLUMN)
        .limit(limit)
        .drop(SAMPLE_ORDER_COLUMN)
    );
  };

  const buildCountQuery = () => {
    const query = esql.from(indices).where`${whereExpression}`.pipe`STATS total = COUNT(*)`;
    return printQuery(query);
  };

  if (sampleSize !== undefined) {
    if (sampleSize <= 0) {
      return { hits: [], total: 0 };
    }

    const countResponse = await runQuery({
      query: buildCountQuery(),
      drop_null_columns: true,
    });

    const total = getCount(countResponse);
    if (total === 0) {
      return { hits: [], total: 0 };
    }

    const sampleProbability = Math.min(1, getExpectedSampleRows(sampleSize) / total);
    const sampleResponse = await runQuery({
      query: buildSampleQuery({ sampleProbability, limit: sampleSize }),
      drop_null_columns: true,
    });

    const hits = parseHits(sampleResponse);
    return { hits, total: hits.length };
  }

  const response = await runQuery({
    query: buildQuery({ limit: size }),
    drop_null_columns: true,
  });
  const hits = parseHits(response);
  return { hits, total: hits.length };
}

function buildWhereExpression({
  start,
  end,
  kql,
  whereCondition,
}: {
  start: number;
  end: number;
  kql?: string;
  whereCondition?: WhereCondition;
}) {
  let expression = esqlTimeRange(start, end);
  if (kql) {
    expression = esql.exp`${expression} AND KQL(${esql.str(kql)})`;
  }
  if (whereCondition) {
    expression = esql.exp`${expression} AND ${whereCondition}`;
  }
  return expression;
}

function parseHits(response: ESQLSearchResponse): Array<SearchHit<Record<string, unknown>>> {
  return parseEsqlSourceDocuments(response).map((doc) => ({
    _index: '',
    _id: getEsqlDocumentId(doc),
    _source: doc.source,
  }));
}

function getCount(response: ESQLSearchResponse): number {
  const total = response.values[0]?.[0];
  return typeof total === 'number' ? total : 0;
}

/**
 * Elasticsearch samples the same positions in every segment a data node reads,
 * so the `SAMPLE` row count varies far more than independent sampling: up to
 * about 23 times its mean on production data (elastic/nightshift-program#2543).
 * Returns the smallest mean that stays `SAMPLE_COUNT_MARGIN_DEVIATIONS` standard
 * deviations above `sampleSize` at `SAMPLE_COUNT_VARIANCE_RATIO` times the mean.
 */
const getExpectedSampleRows = (sampleSize: number): number => {
  const margin = SAMPLE_COUNT_MARGIN_DEVIATIONS * Math.sqrt(SAMPLE_COUNT_VARIANCE_RATIO);
  return Math.ceil(((margin + Math.sqrt(margin ** 2 + 4 * sampleSize)) / 2) ** 2);
};
