/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { esql } from '@elastic/esql';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import { orderBy, uniqBy } from 'lodash';

export interface CategorizeWithSampleRow {
  count: number;
  pattern: string;
  sample: string;
}

// Token form feeds `MATCH(field, tokens, {operator: "AND"})` exclusion in the two-pass flow.
export type CategorizeOutputFormat = 'regex' | 'tokens';

// Caps both passes so neither falls back to a full-population scan on a busy stream.
export const CATEGORIZE_MAX_DOCS_TO_SAMPLE = 100_000;

// Stream fraction above which a pattern is "noise", excluded from the rare pass.
export const NOISE_FRACTION_DEFAULT = 0.01;

// ES|QL's implicit row cap; on truncation the ASC sort keeps the rare tail.
const MAX_CATEGORIZE_ROWS = 1000;

// Dotted paths become column-segment arrays, which `esql.col(...)` needs for nesting.
export function columnPath(field: string): string | string[] {
  return field.includes('.') ? field.split('.') : field;
}

/**
 * Per-pattern doc count + one representative sample. `::keyword` cast because `TOP`
 * needs an aggregatable field. Metadata-free (no `_index`/`_id`/`_source`) so it
 * also runs on ES|QL views, where `METADATA _index` raises `Unknown column`.
 */
export function buildCategorizeWithSampleQuery({
  indices,
  field,
  limit = MAX_CATEGORIZE_ROWS,
  samplingProbability,
  outputFormat,
  excludeTokens,
  countThreshold,
  order = 'ASC',
}: {
  indices: string | string[];
  field: string;
  limit?: number;
  samplingProbability: number;
  outputFormat?: CategorizeOutputFormat;
  excludeTokens?: string[];
  countThreshold?: number;
  order?: 'ASC' | 'DESC';
}): string {
  const fieldCol = esql.col(columnPath(field));

  let query = esql.from(Array.isArray(indices) ? indices : [indices]);

  // Exclusion predicates must sit before SAMPLE and STATS, on the indexed field.
  const whereClauses = [];
  for (const tokens of excludeTokens ?? []) {
    if (tokens.length > 0) {
      whereClauses.push(esql.exp`NOT MATCH(${fieldCol}, ${esql.str(tokens)}, {"operator": "AND"})`);
    }
  }
  if (whereClauses.length > 0) {
    const condition = whereClauses.reduce((acc, current) => esql.exp`${acc} AND ${current}`);
    query = query.where`${condition}`;
  }

  if (samplingProbability < 1) {
    query = query.pipe`SAMPLE ${esql.num(samplingProbability)}`;
  }

  let stats =
    outputFormat === 'tokens'
      ? query.pipe`STATS count = COUNT(*), sample = TOP(${fieldCol}::keyword, 1, "desc") BY pattern = CATEGORIZE(${fieldCol}, {"output_format": "tokens"})`
      : query.pipe`STATS count = COUNT(*), sample = TOP(${fieldCol}::keyword, 1, "desc") BY pattern = CATEGORIZE(${fieldCol})`;

  if (countThreshold !== undefined) {
    stats = stats.where`count > ${esql.num(countThreshold)}`;
  }

  return stats
    .sort([['count'], order, ''])
    .limit(limit)
    .print('basic');
}

export function parseCategorizeWithSampleRows(
  response: ESQLSearchResponse
): CategorizeWithSampleRow[] {
  const countIndex = response.columns.findIndex((column) => column.name === 'count');
  const sampleIndex = response.columns.findIndex((column) => column.name === 'sample');
  const patternIndex = response.columns.findIndex((column) => column.name === 'pattern');

  if (countIndex === -1 || sampleIndex === -1 || patternIndex === -1) {
    return [];
  }

  return response.values.flatMap((row) => {
    const count = row[countIndex];
    const pattern = row[patternIndex];
    const rawSample = row[sampleIndex];
    const sample = Array.isArray(rawSample) ? rawSample[0] : rawSample;

    if (typeof count !== 'number' || typeof pattern !== 'string') {
      return [];
    }

    return [{ count, pattern, sample: typeof sample === 'string' ? sample : '' }];
  });
}

/**
 * Two-pass categorization that surfaces rare patterns single-pass sampling drops.
 * Pass 1 (sampled) keeps only patterns above the noise threshold — the head a
 * random sample always sees. Pass 2 `NOT MATCH`-excludes the head and
 * recategorizes the small residual at near-full probability, so rare patterns are
 * counted exactly. Counts are normalized back to population estimates.
 */
export async function categorizeWithNoiseExclusion({
  esClient,
  indices,
  field,
  total,
  samplingProbability,
  filter,
  noiseFraction = NOISE_FRACTION_DEFAULT,
  maxDocsToSample = CATEGORIZE_MAX_DOCS_TO_SAMPLE,
}: {
  esClient: TracedElasticsearchClient;
  indices: string | string[];
  field: string;
  total: number;
  samplingProbability: number;
  filter?: QueryDslQueryContainer;
  noiseFraction?: number;
  maxDocsToSample?: number;
}): Promise<CategorizeWithSampleRow[]> {
  const p1 = samplingProbability;
  const run = (operationName: string, query: string) =>
    runCategorizeEsql(esClient, operationName, query, filter);

  // In sampled space a `noiseFraction` pattern appears at `noiseFraction*total*p1` docs.
  const sampledThreshold = noiseFraction * total * p1;

  const headQuery = buildCategorizeWithSampleQuery({
    indices,
    field,
    samplingProbability: p1,
    outputFormat: 'tokens',
    countThreshold: sampledThreshold,
  });
  const headRows = normalizeCounts(
    parseCategorizeWithSampleRows(await run('categorize_noise_exclusion_head', headQuery)),
    p1
  );

  if (headRows.length === 0) {
    // No head to strip; a plain sampled categorize is the cheapest safe option.
    // DESC: unthresholded, so ASC silently truncates to the rarest 1000 on wide streams.
    const plainQuery = buildCategorizeWithSampleQuery({
      indices,
      field,
      samplingProbability: p1,
      outputFormat: 'tokens',
      order: 'DESC',
    });
    return dedupeByPattern(
      normalizeCounts(
        parseCategorizeWithSampleRows(await run('categorize_noise_exclusion_plain', plainQuery)),
        p1
      )
    );
  }

  const excludeTokens = headRows.map((row) => row.pattern).filter((pattern) => pattern.length > 0);
  const headDocs = headRows.reduce((sum, row) => sum + row.count, 0);
  const residual = Math.max(0, total - headDocs);

  // A sampled residual is only an estimate, so skip pass 2 only when pass 1 was unsampled.
  if (p1 >= 1 && residual === 0) {
    return dedupeByPattern(headRows);
  }

  const p2 = residual > maxDocsToSample ? maxDocsToSample / residual : 1;

  const rareQuery = buildCategorizeWithSampleQuery({
    indices,
    field,
    samplingProbability: p2,
    outputFormat: 'tokens',
    excludeTokens,
  });
  const rareRows = normalizeCounts(
    parseCategorizeWithSampleRows(await run('categorize_noise_exclusion_rare', rareQuery)),
    p2
  );

  return dedupeByPattern([...headRows, ...rareRows]);
}

async function runCategorizeEsql(
  esClient: TracedElasticsearchClient,
  operationName: string,
  query: string,
  filter?: QueryDslQueryContainer
): Promise<ESQLSearchResponse> {
  return esClient.esql(operationName, {
    query,
    ...(filter ? { filter } : {}),
  }) as unknown as Promise<ESQLSearchResponse>;
}

function normalizeCounts(
  rows: CategorizeWithSampleRow[],
  samplingProbability: number
): CategorizeWithSampleRow[] {
  if (samplingProbability >= 1) {
    return rows;
  }
  return rows.map((row) => ({ ...row, count: Math.round(row.count / samplingProbability) }));
}

function dedupeByPattern(rows: CategorizeWithSampleRow[]): CategorizeWithSampleRow[] {
  // Sort desc first so the higher-count representative wins when an approximate
  // `NOT MATCH` lets a head remnant through pass 2.
  return uniqBy(
    orderBy(rows, (row) => row.count, 'desc'),
    (row) => row.pattern
  );
}
