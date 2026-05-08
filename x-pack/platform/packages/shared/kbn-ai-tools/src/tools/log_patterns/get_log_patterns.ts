/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsAggregationContainer,
  AggregationsCategorizeTextAggregation,
  AggregationsDateHistogramAggregation,
  AggregationsMaxAggregation,
  AggregationsMinAggregation,
  SearchHit,
  AggregationsTopHitsAggregation,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import { esql, type ComposerQueryTagHole } from '@elastic/esql';
import type { ESQLAstExpression } from '@elastic/esql/types';
import { categorizationAnalyzer } from '@kbn/aiops-log-pattern-analysis/categorization_analyzer';
import type { ChangePointType } from '@kbn/es-types/src';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { calculateAuto } from '@kbn/calculate-auto';
import { get, omit, orderBy, uniqBy } from 'lodash';
import moment from 'moment';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import { kqlQuery, dateRangeQuery } from '@kbn/es-query';
import type { Logger } from '@kbn/logging';
import { getEsqlColumnSchema } from '../../utils/get_esql_column_schema';
import { pValueToLabel } from '../../utils/p_value_to_label';

const MAX_DOCS_TO_SAMPLE = 100_000;

// SigEvents asks the LLM for a small common/rare pattern summary. Pulling a
// bounded long tail from one ES|QL categorization query avoids reimplementing
// the DSL helper's second rare-pattern aggregation, while still giving
// selectLogPatternsForLlm enough sorted rows to take the head and tail.
const SIG_EVENTS_PASS1_LIMIT = 1000;

type WhereCondition = ESQLAstExpression & ComposerQueryTagHole;

interface FieldPatternResultBase {
  field: string;
  count: number;
  pattern: string;
  regex: string;
  sample: string;
  firstOccurrence: string;
  lastOccurrence: string;
  highlight: Record<string, string[]>;
  metadata: Record<string, unknown[] | undefined>;
}

interface FieldPatternResultChanges {
  timeseries: Array<{ x: number; y: number }>;
  change: {
    timestamp?: string;
    significance: 'high' | 'medium' | 'low' | null;
    type: ChangePointType;
    change_point?: number;
    p_value?: number;
  };
}

export type FieldPatternResult<TChanges extends boolean | undefined = undefined> =
  FieldPatternResultBase & (TChanges extends true ? FieldPatternResultChanges : {});

export type FieldPatternResultWithChanges = FieldPatternResult<true>;

export interface LogPatternEsqlEntry {
  field: string;
  pattern: string;
  count: number;
  sample: string;
}

interface CategorizeTextOptions {
  query: QueryDslQueryContainer;
  metadata: string[];
  esClient: TracedElasticsearchClient;
  samplingProbability: number;
  fields: string[];
  index: string | string[];
  useMlStandardTokenizer: boolean;
  size: number;
  start: number;
  end: number;
}

type CategorizeTextSubAggregations = Record<string, AggregationsAggregationContainer> & {
  sample: { top_hits: AggregationsTopHitsAggregation };
  minTimestamp: { min: AggregationsMinAggregation };
  maxTimestamp: { max: AggregationsMaxAggregation };
};

interface CategorizeTextAggregationResult {
  categorize_text: AggregationsCategorizeTextAggregation;
  aggs: CategorizeTextSubAggregations &
    (
      | {}
      | {
          timeseries: { date_histogram: AggregationsDateHistogramAggregation };
          changes: { change_point: { buckets_path: string } };
        }
    );
}

export async function runCategorizeTextAggregation<
  TChanges extends boolean | undefined = undefined
>(
  options: CategorizeTextOptions & { includeChanges?: TChanges }
): Promise<Array<FieldPatternResult<TChanges>>>;

export async function runCategorizeTextAggregation({
  esClient,
  fields,
  metadata,
  index,
  query,
  samplingProbability,
  useMlStandardTokenizer,
  includeChanges,
  size,
  start,
  end,
}: CategorizeTextOptions & { includeChanges?: boolean }): Promise<
  Array<FieldPatternResult<boolean>>
> {
  const aggs = Object.fromEntries(
    fields.map((field): [string, CategorizeTextAggregationResult] => [
      field,
      {
        categorize_text: {
          field,
          min_doc_count: 1,
          size,
          categorization_analyzer: useMlStandardTokenizer
            ? {
                tokenizer: 'ml_standard',
                char_filter: [
                  {
                    type: 'pattern_replace',
                    pattern: '\\\\n',
                    replacement: '',
                  } as unknown as string,
                ],
              }
            : categorizationAnalyzer,
        },
        aggs: {
          minTimestamp: {
            min: {
              field: '@timestamp',
            },
          },
          maxTimestamp: {
            max: {
              field: '@timestamp',
            },
          },
          ...(includeChanges
            ? {
                timeseries: {
                  date_histogram: {
                    field: '@timestamp',
                    min_doc_count: 0,
                    extended_bounds: {
                      min: start,
                      max: end,
                    },
                    fixed_interval: `${calculateAuto
                      .atLeast(30, moment.duration(end - start, 'ms'))!
                      .asMilliseconds()}ms`,
                  },
                },
                changes: {
                  change_point: {
                    buckets_path: 'timeseries>_count',
                  },
                },
              }
            : {}),
          sample: {
            top_hits: {
              size: 1,
              _source: false,
              fields: [field, ...metadata],
              sort: {
                _score: {
                  order: 'desc',
                },
              },
              highlight: {
                fields: {
                  '*': {},
                },
              },
            },
          },
        },
      },
    ])
  );

  const response = await esClient.search('get_log_patterns', {
    index,
    size: 0,
    track_total_hits: false,
    timeout: '10s',
    query: {
      bool: {
        filter: [query, ...dateRangeQuery(start, end)],
      },
    },
    aggregations: {
      sampler: {
        random_sampler: {
          probability: samplingProbability,
        },
        aggs,
      },
    },
  });

  if (!response.aggregations) {
    return [];
  }

  const fieldAggregates = omit(response.aggregations.sampler, 'seed', 'doc_count', 'probability');

  return Object.entries(fieldAggregates).flatMap(([fieldName, aggregate]) => {
    const buckets = aggregate.buckets;

    return buckets.map((bucket) => {
      return {
        field: fieldName,
        count: bucket.doc_count,
        pattern: bucket.key,
        regex: bucket.regex,
        sample: bucket.sample.hits.hits[0].fields![fieldName]![0] as string,
        highlight: bucket.sample.hits.hits[0].highlight ?? {},
        metadata: bucket.sample.hits.hits[0].fields!,
        firstOccurrence: new Date(bucket.minTimestamp.value!).toISOString(),
        lastOccurrence: new Date(bucket.maxTimestamp.value!).toISOString(),
        ...('timeseries' in bucket
          ? {
              // @ts-expect-error timeseries result types can't be inferred
              timeseries: bucket.timeseries.buckets.map((dateBucket) => ({
                x: dateBucket.key,
                y: dateBucket.doc_count,
              })),
              // @ts-expect-error changes result types can't be inferred
              change: Object.entries(bucket.changes.type).map(
                ([changePointType, change]): FieldPatternResultChanges['change'] => {
                  return {
                    type: changePointType as ChangePointType,
                    significance:
                      // @ts-expect-error changes result types can't be inferred
                      change.p_value !== undefined ? pValueToLabel(change.p_value) : null,
                    // @ts-expect-error changes result types can't be inferred
                    change_point: change.change_point,
                    // @ts-expect-error changes result types can't be inferred
                    p_value: change.p_value,
                    timestamp:
                      // @ts-expect-error changes result types can't be inferred
                      change.change_point !== undefined
                        ? // @ts-expect-error changes and timeseries result types can't be inferred
                          bucket.timeseries.buckets[change.change_point].key_as_string
                        : undefined,
                  };
                }
              )[0],
            }
          : {}),
      };
    });
  });
}

interface LogPatternOptions {
  esClient: TracedElasticsearchClient;
  start: number;
  end: number;
  index: string | string[];
  fields: string[];
  metadata?: string[];
  kql?: string;
}

interface SigEventsLogPatternEsqlOptions {
  esClient: TracedElasticsearchClient;
  start: number;
  end: number;
  index: string | string[];
  fields: string[];
  kql?: string;
  logger: Logger;
}

export async function getLogPatterns<TChanges extends boolean | undefined = undefined>(
  options: LogPatternOptions & { includeChanges?: TChanges }
): Promise<Array<FieldPatternResult<TChanges>>>;

export async function getLogPatterns({
  esClient,
  start,
  end,
  index,
  kql,
  includeChanges,
  metadata = [],
  fields,
}: LogPatternOptions & { includeChanges?: boolean }): Promise<Array<FieldPatternResult<boolean>>> {
  const fieldCapsResponse = await esClient.fieldCaps('get_field_caps_for_log_pattern_analysis', {
    fields,
    index_filter: {
      bool: {
        filter: [...dateRangeQuery(start, end)],
      },
    },
    index,
    types: ['text', 'match_only_text'],
  });

  const fieldsInFieldCaps = Object.keys(fieldCapsResponse.fields);

  if (!fieldsInFieldCaps.length) {
    return [];
  }

  const totalDocsResponse = await esClient.search('get_total_docs_for_log_pattern_analysis', {
    index,
    size: 0,
    track_total_hits: true,
    query: {
      bool: {
        filter: [...kqlQuery(kql), ...dateRangeQuery(start, end)],
      },
    },
  });

  const totalHits = totalDocsResponse.hits.total.value;

  if (totalHits === 0) {
    return [];
  }

  let samplingProbability = 100_000 / totalHits;

  if (samplingProbability >= 0.5) {
    samplingProbability = 1;
  }

  const fieldGroups = includeChanges
    ? fieldsInFieldCaps.map((field) => [field])
    : [fieldsInFieldCaps];

  const allPatterns = await Promise.all(
    fieldGroups.map(async (fieldGroup) => {
      const topMessagePatterns = await runCategorizeTextAggregation({
        esClient,
        index,
        fields: fieldGroup,
        query: {
          bool: {
            filter: kqlQuery(kql),
          },
        },
        samplingProbability,
        useMlStandardTokenizer: false,
        size: 100,
        start,
        end,
        includeChanges,
        metadata,
      });

      if (topMessagePatterns.length === 0) {
        return [];
      }

      const patternsToExclude = topMessagePatterns.filter((pattern) => pattern.count >= 50);
      const excludeQueries = patternsToExclude.map((pattern) => {
        return {
          match: {
            [pattern.field]: {
              query: pattern.pattern,
              fuzziness: 0,
              operator: 'and' as const,
              auto_generate_synonyms_phrase_query: false,
            },
          },
        };
      });

      const rareMessagePatterns = await runCategorizeTextAggregation({
        esClient,
        index,
        fields: fieldGroup,
        start,
        end,
        query: {
          bool: {
            filter: kqlQuery(kql),
            must_not: excludeQueries,
          },
        },
        size: 1000,
        includeChanges,
        samplingProbability: 1,
        useMlStandardTokenizer: true,
        metadata,
      });

      return [...patternsToExclude, ...rareMessagePatterns];
    })
  );

  return uniqBy(
    orderBy(allPatterns.flat(), (pattern) => pattern.count, 'desc'),
    (pattern) => pattern.sample
  );
}

export async function getSigEventsLogPatternsEsql({
  esClient,
  start,
  end,
  index,
  kql,
  fields,
  logger,
}: SigEventsLogPatternEsqlOptions): Promise<LogPatternEsqlEntry[]> {
  const columns = await getEsqlColumnSchema({
    esClient: esClient.client,
    index,
    start,
    end,
  });
  const textColumnNames = new Set(
    columns.filter((column) => column.type === 'text').map((column) => column.name)
  );
  const eligibleFields = fields.filter((field) => textColumnNames.has(field));

  if (!eligibleFields.length) {
    return [];
  }

  const totalDocs = await runEsqlCountQuery({ esClient, index, start, end, kql });
  if (totalDocs === 0) {
    return [];
  }

  const samplingProbability =
    MAX_DOCS_TO_SAMPLE / totalDocs < 0.5 ? MAX_DOCS_TO_SAMPLE / totalDocs : 1;
  const perField = await Promise.all(
    eligibleFields.map(async (field) => {
      // Pass 1 mirrors the diverse-sampling strategy: categorize and keep one
      // representative composite key per pattern. ES|QL grouped aggregations do
      // not provide a coherent full `_source` document in the same row.
      const pass1Rows = await runSigEventsPass1({
        esClient,
        index,
        start,
        end,
        kql,
        field,
        samplingProbability,
        limit: SIG_EVENTS_PASS1_LIMIT,
      });

      if (pass1Rows.length === 0) {
        return [];
      }

      // Fetch full sources by composite key in a second query. This avoids `_id`
      // collisions across backing indices and keeps every sample value from the
      // same underlying log line. Use the wrapped raw client here instead of traced as this is cheap
      const pass2Response = (await esClient.client.esql.query({
        query: buildPass2Query(
          Array.isArray(index) ? index : [index],
          pass1Rows.map(({ docKey }) => docKey)
        ),
        filter: { bool: { filter: dateRangeQuery(start, end) } },
        drop_null_columns: true,
      })) as unknown as ESQLSearchResponse;
      const keyToHit = new Map(
        parsePass2Hits(pass2Response).map((hit) => [`${hit._index}:${hit._id}`, hit])
      );
      const patterns: LogPatternEsqlEntry[] = [];

      for (const row of pass1Rows) {
        const hit = keyToHit.get(row.docKey);
        if (!hit) {
          logger.warn(
            `Log patterns (ES|QL): doc ${row.docKey} not found in pass-2 fetch (deleted between passes); skipping pattern.`
          );
          continue;
        }

        patterns.push({
          field,
          pattern: row.pattern,
          // DSL random_sampler returns population-scaled doc_counts. ES|QL
          // SAMPLE returns sampled counts, so scale back for prompt parity.
          count: Math.round(row.count / samplingProbability),
          // Dotted ECS paths such as `body.text` are nested in `_source`; direct
          // bracket access would turn valid samples into empty strings.
          sample: String(get(hit._source, field) ?? ''),
        });
      }

      return patterns;
    })
  );

  return uniqBy(
    // Preserve the DSL helper's downstream contract: sorted descending by count
    // and deduped by sample so `message` and `body.text` do not show the same
    // representative log line twice.
    perField.flat().sort((a, b) => b.count - a.count),
    (pattern) => pattern.sample
  );
}

async function runEsqlCountQuery({
  esClient,
  index,
  start,
  end,
  kql,
}: {
  esClient: TracedElasticsearchClient;
  index: string | string[];
  start: number;
  end: number;
  kql?: string;
}): Promise<number> {
  const response = (await esClient.esql('count_docs_for_sigevents_log_patterns', {
    query: buildCountQuery({ index, kql }),
    filter: { bool: { filter: dateRangeQuery(start, end) } },
    drop_null_columns: true,
  })) as unknown as ESQLSearchResponse;
  const total = response.values[0]?.[0];

  return typeof total === 'number' ? total : 0;
}

async function runSigEventsPass1({
  esClient,
  index,
  start,
  end,
  kql,
  field,
  samplingProbability,
  limit,
}: {
  esClient: TracedElasticsearchClient;
  index: string | string[];
  start: number;
  end: number;
  kql?: string;
  field: string;
  samplingProbability: number;
  limit: number;
}): Promise<Array<{ docKey: string; count: number; pattern: string }>> {
  const response = (await esClient.esql('categorize_sigevents_log_patterns', {
    query: buildPass1Query({
      indices: Array.isArray(index) ? index : [index],
      kql,
      field,
      samplingProbability,
      limit,
    }),
    filter: { bool: { filter: dateRangeQuery(start, end) } },
    drop_null_columns: true,
  })) as unknown as ESQLSearchResponse;

  return parsePass1Rows(response);
}

function buildWhereExpression(kql?: string): WhereCondition | undefined {
  return kql ? esql.exp`KQL(${esql.str(kql)})` : undefined;
}

function buildCountQuery({ index, kql }: { index: string | string[]; kql?: string }): string {
  const whereExpression = buildWhereExpression(kql);
  let query = esql.from(Array.isArray(index) ? index : [index]);

  if (whereExpression) {
    query = query.where`${whereExpression}`;
  }

  return query.pipe`STATS total = COUNT(*)`.print('basic');
}

function columnPath(field: string): string | string[] {
  return field.includes('.') ? field.split('.') : field;
}

/**
 * SigEvents-only ES|QL categorization. Unlike getLogPatterns(), this helper does
 * not synthesize regex/highlight/metadata/timeseries/change-point output because
 * the live SigEvents consumer only sends `{ field, pattern, count, sample }` to
 * the LLM. The full DSL helper remains in place for Observability RCA, where
 * change-point output is still consumed.
 */
function buildPass1Query({
  indices,
  kql,
  field,
  samplingProbability,
  limit,
}: {
  indices: string[];
  kql?: string;
  field: string;
  samplingProbability: number;
  limit: number;
}): string {
  const whereExpression = buildWhereExpression(kql);
  // `_index:_id` is the join key, not `_id` alone: stream names can expand to
  // multiple backing indices, and Elasticsearch only guarantees `_id`
  // uniqueness inside a single index.
  let query = esql.from(indices, ['_index', '_id']).pipe`EVAL doc_key = CONCAT(${esql.col(
    '_index'
  )}, ":", ${esql.col('_id')})`;

  if (whereExpression) {
    query = query.where`${whereExpression}`;
  }
  if (samplingProbability < 1) {
    query = query.pipe`SAMPLE ${esql.num(samplingProbability)}`;
  }

  return query.pipe`STATS representative_key = TOP(doc_key, 1, "desc"), count = COUNT(*) BY pattern = CATEGORIZE(${esql.col(
    columnPath(field)
  )})`
    .sort([['count'], 'DESC', ''])
    .limit(limit)
    .print('basic');
}

/**
 * Fetches coherent `_source` documents for the pass-1 representative keys. This
 * intentionally duplicates the diverse-sampling pass-2 shape instead of using
 * getSampleDocumentsEsql, whose parser discards `_index`.
 */
function buildPass2Query(indices: string[], docKeys: string[]): string {
  const query = esql.from(indices, ['_index', '_id', '_source'])
    .pipe`EVAL doc_key = CONCAT(${esql.col('_index')}, ":", ${esql.col('_id')})`;

  return query.pipe`WHERE doc_key IN (${docKeys.map((docKey) => esql.str(docKey))})`
    .pipe`KEEP _index, _id, _source`
    .limit(docKeys.length)
    .print('basic');
}

function parsePass1Rows(
  response: ESQLSearchResponse
): Array<{ docKey: string; count: number; pattern: string }> {
  const keyIndex = response.columns.findIndex((column) => column.name === 'representative_key');
  const countIndex = response.columns.findIndex((column) => column.name === 'count');
  const patternIndex = response.columns.findIndex((column) => column.name === 'pattern');

  if (keyIndex === -1 || countIndex === -1 || patternIndex === -1) {
    return [];
  }

  return response.values.flatMap((row) => {
    const rawKey = row[keyIndex];
    // Accept both scalar and single-item-array TOP responses; pass 1 still asks
    // ES|QL for exactly one representative key.
    const docKey = Array.isArray(rawKey) ? rawKey[0] : rawKey;
    const count = row[countIndex];
    const pattern = row[patternIndex];

    if (typeof docKey !== 'string' || typeof count !== 'number' || typeof pattern !== 'string') {
      return [];
    }

    return [{ docKey, count, pattern }];
  });
}

function parsePass2Hits(response: ESQLSearchResponse): Array<SearchHit<Record<string, unknown>>> {
  const indexIndex = response.columns.findIndex((column) => column.name === '_index');
  const idIndex = response.columns.findIndex((column) => column.name === '_id');
  const sourceIndex = response.columns.findIndex((column) => column.name === '_source');

  if (indexIndex === -1 || idIndex === -1 || sourceIndex === -1) {
    return [];
  }

  return response.values.flatMap((row) => {
    const index = row[indexIndex];
    const id = row[idIndex];

    if (typeof index !== 'string' || typeof id !== 'string') {
      return [];
    }

    return [
      {
        _index: index,
        _id: id,
        _source: (row[sourceIndex] as Record<string, unknown> | null) ?? {},
      },
    ];
  });
}
