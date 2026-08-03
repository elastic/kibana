/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { esql } from '@elastic/esql';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import { orderBy, uniqBy } from 'lodash';

export interface CategorizeWithSampleRow {
  count: number;
  pattern: string;
  sample: string;
}

/**
 * `CATEGORIZE` can emit either a Lucene-style regex (default) or the analyzed
 * key tokens. The token form (e.g. `"Request completed"`) is both more
 * readable and directly usable as a `MATCH(field, tokens, {operator: "AND"})`
 * predicate, which is what makes the two-pass noise exclusion below possible.
 */
export type CategorizeOutputFormat = 'regex' | 'tokens';

/**
 * Documents scanned by the cheap "find the noise" pass are capped at this many
 * via ES|QL `SAMPLE`; the same cap bounds the exact "recategorize the residual"
 * pass so it can never fall back to a full-population scan on a busy stream.
 */
export const CATEGORIZE_MAX_DOCS_TO_SAMPLE = 100_000;

/**
 * A pattern is treated as high-volume "noise" (and excluded from the rare pass)
 * when it accounts for more than this fraction of the stream. Relative rather
 * than absolute so it is scale-free across streams of any size, and expressed
 * as a post-`STATS` `WHERE count > threshold` (never `SORT count | LIMIT`), so
 * it does not depend on the pattern count and avoids the `CATEGORIZE` + TopN
 * pushdown crash (elastic/elasticsearch#154534).
 */
export const NOISE_FRACTION_DEFAULT = 0.01;

/**
 * ES|QL capabilities the two-pass flow depends on, reported by `GET
 * _capabilities` as the lowercased `EsqlCapabilities.Cap` enum names:
 * - `categorize_options`: the `CATEGORIZE(field, {"output_format": ...})` map.
 * - `match_function_options`: the `MATCH(field, tokens, {"operator": ...})` map.
 */
export const TWO_PASS_ESQL_CAPABILITIES = ['categorize_options', 'match_function_options'];

// Memoized per client (in-flight result included). Request-scoped clients expire
// the cache naturally, avoiding rolling-upgrade staleness; failed checks aren't cached.
const twoPassSupportByClient = new WeakMap<ElasticsearchClient, Promise<boolean>>();

/**
 * Proactively resolves whether the target cluster can run the two-pass
 * categorization syntax, so callers branch to the legacy single-pass instead of
 * speculatively firing a query a pre-capability ES would reject.
 *
 * `GET _capabilities` returns `supported: true` only when every node supports
 * every requested capability; `false` (partial/older cluster) and `null`
 * (unknown — a node too old to answer) both map to "unsupported", so a rolling
 * upgrade never runs a doomed query.
 */
export const esqlSupportsTwoPass = (
  esClient: ElasticsearchClient,
  options?: { signal?: AbortSignal }
): Promise<boolean> => {
  const cached = twoPassSupportByClient.get(esClient);
  if (cached) {
    return cached;
  }

  const check = esClient
    .capabilities(
      { method: 'POST', path: '/_query', capabilities: TWO_PASS_ESQL_CAPABILITIES },
      options
    )
    .then((response) => response.supported === true)
    .catch(() => {
      // A failed/absent capabilities check degrades this call to single-pass but
      // is not cached, so a transient failure cannot disable two-pass for the
      // lifetime of a long-lived client.
      twoPassSupportByClient.delete(esClient);
      return false;
    });

  twoPassSupportByClient.set(esClient, check);
  return check;
};

/**
 * Converts a possibly-dotted ECS field path (e.g. `body.text`) into the
 * ES|QL Composer column-path shape (`['body', 'text']`), or returns the literal
 * field name when there is no dot. Required because `esql.col(...)` accepts a
 * column-segment array for nested paths.
 */
export function columnPath(field: string): string | string[] {
  return field.includes('.') ? field.split('.') : field;
}

/**
 * Builds an ES|QL categorization query that returns, per pattern, the document
 * count and one representative sample value for the field. The sample uses
 * `TOP(<field>::keyword, 1, "desc")`: text fields are not aggregatable, so the
 * cast to keyword makes the value usable by `TOP` while keeping the original
 * message text.
 *
 * Crucially this needs no `_index`/`_id`/`_source` metadata, so it works for both
 * concrete indices and ES|QL views (e.g. query streams' `$.<name>` views), where
 * `FROM <view> METADATA _index, _id` raises `Unknown column [_index]`.
 *
 * Optional knobs support the two-pass noise-exclusion flow in
 * {@link categorizeWithNoiseExclusion}:
 * - `excludeTokens`: full-text `WHERE NOT MATCH(field, tokens, {operator: AND})`
 *   clauses (before `STATS`) that drop the documents belonging to the noisy head.
 * - `countThreshold`: post-`STATS` `WHERE count > n` used to isolate the head.
 * - `outputFormat`: `CATEGORIZE` output form (`tokens` when the pattern must be
 *   reused as a `MATCH` predicate).
 *
 * `sortByCountDesc` + `limit` reproduce the legacy `SORT count DESC | LIMIT n`
 * shape and are opt-in only: that shape triggers elastic/elasticsearch#154534
 * when the category count exceeds the limit, so callers should prefer client-side
 * ordering.
 */
export function buildCategorizeWithSampleQuery({
  indices,
  field,
  limit,
  samplingProbability,
  outputFormat,
  excludeTokens,
  countThreshold,
  sortByCountDesc = false,
}: {
  indices: string | string[];
  field: string;
  limit?: number;
  samplingProbability: number;
  outputFormat?: CategorizeOutputFormat;
  excludeTokens?: string[];
  countThreshold?: number;
  sortByCountDesc?: boolean;
}): string {
  const fieldCol = esql.col(columnPath(field));

  let query = esql.from(Array.isArray(indices) ? indices : [indices]);

  // Noise-pattern exclusion predicates must sit before SAMPLE and STATS on the
  // indexed field. Combine them into a single WHERE. The caller applies any KQL
  // and date-range filtering through the ES|QL request `filter`, which prefilters
  // the source before this pipeline.
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

  if (sortByCountDesc) {
    stats = stats.sort([['count'], 'DESC', '']);
  }

  if (limit !== undefined) {
    stats = stats.limit(limit);
  }

  return stats.print('basic');
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
 * Two-pass log categorization that reliably surfaces rare-but-salient patterns
 * that single-pass sampling drops.
 *
 * Pass 1 (cheap, sampled): categorize the sample and keep only patterns above
 * the relative noise threshold — the high-volume "head" that a random sample
 * always sees. Pass 2 excludes those head patterns' documents via full-text
 * `NOT MATCH` and recategorizes the remainder; because the head is ~all of the
 * volume, the residual is small enough to categorize at (near-)full probability,
 * so rare patterns are counted exactly instead of being sampled away.
 *
 * Costs are bounded on both ends: pass 1 by the `maxDocsToSample` cap, pass 2 by
 * the residual (and it re-samples if the residual is still large). Neither pass
 * uses `SORT count DESC | LIMIT`, so neither hits elastic/elasticsearch#154534.
 *
 * Counts are normalized back to population estimates. ES|QL queries run through
 * the traced client with the caller's prefilter applied via the request `filter`.
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
  signal,
}: {
  esClient: TracedElasticsearchClient;
  indices: string | string[];
  field: string;
  total: number;
  samplingProbability: number;
  filter?: QueryDslQueryContainer;
  noiseFraction?: number;
  maxDocsToSample?: number;
  signal?: AbortSignal;
}): Promise<CategorizeWithSampleRow[]> {
  const p1 = samplingProbability;
  const run = (operationName: string, query: string) =>
    runCategorizeEsql(esClient, operationName, query, filter);

  const twoPassSupported = await esqlSupportsTwoPass(esClient.client, { signal });

  // Legacy single categorize (regex form, no exclusion) — the degraded path when
  // the cluster does not support the two-pass option syntax. Gated proactively via
  // `_capabilities`, so no speculative query is ever fired at a pre-capability ES;
  // every other error propagates rather than silently degrading to this
  // frequency-biased query.
  if (!twoPassSupported) {
    const legacyQuery = buildCategorizeWithSampleQuery({ indices, field, samplingProbability: p1 });
    return dedupeByPattern(
      normalizeCounts(
        parseCategorizeWithSampleRows(await run('categorize_noise_exclusion_legacy', legacyQuery)),
        p1
      )
    );
  }

  // Threshold in sampled space: a pattern that is `noiseFraction` of the
  // population appears at `noiseFraction * total * p1` docs in the sample.
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
    // No dominant pattern to strip. A plain sampled categorize is the best we
    // can cheaply do — a full-probability scan over the whole population would
    // risk timing out on busy streams.
    const plainQuery = buildCategorizeWithSampleQuery({
      indices,
      field,
      samplingProbability: p1,
      outputFormat: 'tokens',
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

  // Skip pass 2 only when the residual is exactly zero AND pass 1 was unsampled;
  // a sampled residual is an estimate, so run pass 2 (its exclusion keeps it cheap).
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
  // Sort descending first so the higher-count representative of a pattern wins
  // if the approximate `NOT MATCH` exclusion let a head remnant through pass 2.
  return uniqBy(
    orderBy(rows, (row) => row.count, 'desc'),
    (row) => row.pattern
  );
}
