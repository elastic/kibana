/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { esql } from '@elastic/esql';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { dateRangeQuery } from '@kbn/es-query';
import type { Logger } from '@kbn/logging';
import { get } from 'lodash';
import { getEsqlColumnSchema } from '../../utils/get_esql_column_schema';
import {
  categorizeWithNoiseExclusion,
  columnPath,
  esqlSupportsTwoPass,
  type CategorizeWithSampleRow,
} from '../../utils/esql_categorize';
import {
  getEsqlDocumentId,
  parseEsqlSourceDocuments,
} from '../../utils/parse_esql_source_documents';

const MESSAGE_FIELD_CANDIDATES = ['message', 'body.text'];
const MAX_DOCS_TO_SAMPLE = 100_000;
// Over-fetch factor for each metadata-free source-fetch round: a representative
// value is not a unique key, so we pull several docs per value and keep the
// first. Combined with the re-query-missing loop below this guarantees coverage.
const SOURCE_FETCH_PER_VALUE = 10;

interface GetDiverseSampleDocumentsOptions {
  esClient: ElasticsearchClient;
  index: string | string[];
  start: number;
  end: number;
  iteration: number;
  size?: number;
  logger: Logger;
  requestTimeout: number;
}

export async function getDiverseSampleDocuments({
  esClient,
  index,
  start,
  end,
  size = 100,
  iteration,
  logger,
  requestTimeout,
}: GetDiverseSampleDocumentsOptions): Promise<{ hits: Array<SearchHit<Record<string, unknown>>> }> {
  const timeRangeFilter = dateRangeQuery(start, end);
  const filter = { bool: { filter: timeRangeFilter } };
  const indices = Array.isArray(index) ? index : [index];

  // One deadline for the whole call: this can issue several sequential
  // requests (schema/count, categorize, one or more source-fetch rounds), and
  // a fresh per-request timeout would let `requestTimeout` be exceeded many
  // times over. Sharing one signal means later requests only get whatever
  // time earlier ones left.
  const signal = AbortSignal.timeout(requestTimeout);

  const [messageField, totalDocs] = await Promise.all([
    detectMessageField({ esClient, index, start, end, signal }),
    runEsqlCount({ esClient, indices, filter, signal }),
  ]);

  if (totalDocs === 0 || !messageField) {
    // No message-like text field to categorize by: the caller's own random
    // sampling arm already covers this case as a backfill, so there's nothing
    // useful for this arm to contribute.
    return { hits: [] };
  }

  // The SAMPLE probability mirrors the previous DSL random_sampler cap:
  // categorizing every document in a busy stream is expensive, and this helper
  // only needs representative document diversity, not exact category counts.
  const samplingProbability =
    MAX_DOCS_TO_SAMPLE / totalDocs < 0.5 ? MAX_DOCS_TO_SAMPLE / totalDocs : 1;

  // Rare patterns surfaced here become candidate representative documents. The
  // categorize stays metadata-free, so it works on ES|QL views (query streams'
  // `$.<name>` views), where `FROM <view> METADATA _index, _id` raises
  // `Unknown column [_index]`.
  const rows = await categorizeWithNoiseExclusion({
    indices,
    field: messageField,
    total: totalDocs,
    samplingProbability,
    twoPassSupported: await esqlSupportsTwoPass(esClient, { signal }),
    run: (query) =>
      esClient.esql.query(
        { query, filter, drop_null_columns: true },
        { signal }
      ) as unknown as Promise<ESQLSearchResponse>,
  });

  const window = selectStratifiedWindow(rows, { iteration, size });

  const sampleValues = Array.from(
    new Set(window.map((row) => row.sample).filter((sample) => sample.length > 0))
  );

  if (sampleValues.length === 0) {
    return { hits: [] };
  }

  const valueToHit = await fetchRepresentativeDocuments({
    esClient,
    indices,
    field: messageField,
    sampleValues,
    filter,
    signal,
  });

  // Emit one document per category, preserving the count-descending window order.
  const hits: Array<SearchHit<Record<string, unknown>>> = [];
  const emittedValues = new Set<string>();
  for (const row of window) {
    const hit = valueToHit.get(row.sample);
    if (hit && !emittedValues.has(row.sample)) {
      emittedValues.add(row.sample);
      hits.push(hit);
    }
  }

  if (hits.length < window.length) {
    logger.debug(
      `Diverse sampling: resolved ${hits.length}/${window.length} representative documents.`
    );
  }

  return { hits };
}

// Orders a pattern by its own identity, not its sampling-jittered count, so
// re-sampling near-equal counts can't change which representative an iteration
// picks. Modulo stays in safe-integer range without bitwise ops.
const hashPattern = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) % 2147483647;
  }
  return hash;
};

/**
 * Selects a diverse, cursor-free window of patterns for one identify iteration.
 *
 * Rank by frequency, cut into `size` equal bands, and take one pattern per band
 * so every window spans common→rare — a head+mid+tail cross-section helps
 * entity/dependency discovery and keeps the arm useful when the loop terminates
 * early. `iteration` rotates the within-band pick, so consecutive iterations
 * surface different members and coverage advances without a positional cursor.
 * Within-band order is by {@link hashPattern} to stay stable under sampling jitter.
 */
export const selectStratifiedWindow = (
  rows: CategorizeWithSampleRow[],
  { iteration, size }: { iteration: number; size: number }
): CategorizeWithSampleRow[] => {
  if (rows.length <= size) {
    return rows;
  }

  const ranked = rows.slice().sort((a, b) => b.count - a.count);
  const rotation = Math.max(0, iteration - 1);
  const window: CategorizeWithSampleRow[] = [];

  for (let band = 0; band < size; band++) {
    const from = Math.floor((band * ranked.length) / size);
    const to = Math.floor(((band + 1) * ranked.length) / size);
    const members = ranked
      .slice(from, to)
      .sort((a, b) => hashPattern(a.pattern) - hashPattern(b.pattern));
    if (members.length > 0) {
      window.push(members[rotation % members.length]);
    }
  }

  return window;
};

/**
 * Fetches the full document for each representative value, returning a map from
 * representative value to its hit.
 *
 * Keeping `METADATA _id, _source` means concrete indices return the real nested
 * `_source`, while views silently drop it and `parseEsqlSourceDocuments`
 * reconstructs the source from the projected columns. The join key is the
 * representative field value (not `_id`), so this is metadata-free too.
 *
 * A representative value is not a unique key, so a single `WHERE field IN
 * (values) | LIMIT n` lets one high-frequency value crowd others out of the
 * budget. To guarantee every value resolves, re-query only the still-missing
 * values each round — their per-value budget grows as the set shrinks — until
 * all are resolved or a round resolves nothing (the rest have no live document).
 * `pending` strictly shrinks each iteration, so this terminates.
 */
async function fetchRepresentativeDocuments({
  esClient,
  indices,
  field,
  sampleValues,
  filter,
  signal,
}: {
  esClient: ElasticsearchClient;
  indices: string[];
  field: string;
  sampleValues: string[];
  filter: { bool: { filter: ReturnType<typeof dateRangeQuery> } };
  signal: AbortSignal;
}): Promise<Map<string, SearchHit<Record<string, unknown>>>> {
  const valueToHit = new Map<string, SearchHit<Record<string, unknown>>>();
  let pending = sampleValues;

  while (pending.length > 0) {
    const fetchQueryParams = {
      query: buildSourceFetchQuery({
        indices,
        field,
        values: pending,
        limit: pending.length * SOURCE_FETCH_PER_VALUE,
      }),
      filter,
      drop_null_columns: true,
    };
    const fetchResponse = (await esClient.esql.query(fetchQueryParams, {
      signal,
    })) as unknown as ESQLSearchResponse;

    const docs = parseEsqlSourceDocuments(fetchResponse);
    const joinValues = resolveFieldValues({ response: fetchResponse, docs, field });

    const resolvedBeforeRound = valueToHit.size;
    docs.forEach((doc, i) => {
      const value = joinValues[i];
      if (value === undefined || valueToHit.has(value)) {
        return;
      }
      valueToHit.set(value, { _index: '', _id: getEsqlDocumentId(doc), _source: doc.source });
    });

    if (valueToHit.size === resolvedBeforeRound) {
      break;
    }
    pending = pending.filter((value) => !valueToHit.has(value));
  }

  return valueToHit;
}

/**
 * Resolves the categorized field value for each parsed document.
 */
function resolveFieldValues({
  response,
  docs,
  field,
}: {
  response: ESQLSearchResponse;
  docs: Array<{ source: Record<string, unknown> }>;
  field: string;
}): Array<string | undefined> {
  const normalize = (raw: unknown): string | undefined =>
    raw == null ? undefined : String(Array.isArray(raw) ? raw[0] : raw);

  // The column read is only safe when rows map 1:1 to the parsed documents.
  const fieldIndex =
    response.values.length === docs.length
      ? response.columns.findIndex((column) => column.name === field)
      : -1;

  return docs.map((doc, i) => {
    const fromColumn = fieldIndex === -1 ? undefined : normalize(response.values[i][fieldIndex]);
    const fromSource = normalize(field in doc.source ? doc.source[field] : get(doc.source, field));
    return fromColumn ?? fromSource;
  });
}

function buildSourceFetchQuery({
  indices,
  field,
  values,
  limit,
}: {
  indices: string[];
  field: string;
  values: string[];
  limit: number;
}): string {
  return esql.from(indices, ['_id', '_source']).where`${esql.col(
    columnPath(field)
  )}::keyword IN (${values.map((value) => esql.str(value))})`
    .limit(limit)
    .print('basic');
}

async function detectMessageField({
  esClient,
  index,
  start,
  end,
  signal,
}: {
  esClient: ElasticsearchClient;
  index: string | string[];
  start: number;
  end: number;
  signal: AbortSignal;
}): Promise<string | undefined> {
  const columns = await getEsqlColumnSchema({ esClient, index, start, end, signal });
  const textColumnNames = new Set(
    columns.filter((column) => column.type === 'text').map((column) => column.name)
  );

  for (const candidate of MESSAGE_FIELD_CANDIDATES) {
    if (textColumnNames.has(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

async function runEsqlCount({
  esClient,
  indices,
  filter,
  signal,
}: {
  esClient: ElasticsearchClient;
  indices: string[];
  filter: { bool: { filter: ReturnType<typeof dateRangeQuery> } };
  signal: AbortSignal;
}): Promise<number> {
  const countQueryParams = {
    query: esql.from(indices).pipe`STATS total = COUNT(*)`.print('basic'),
    filter,
    drop_null_columns: true,
  };
  const response = (await esClient.esql.query(countQueryParams, {
    signal,
  })) as unknown as ESQLSearchResponse;
  const total = response.values[0]?.[0];

  return typeof total === 'number' ? total : 0;
}
