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
  buildCategorizeWithSampleQuery,
  columnPath,
  parseCategorizeWithSampleRows,
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
  offset: number;
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
  offset,
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

  // Categorize pass: group by message pattern and keep one representative field
  // value per pattern via `TOP(<field>::keyword, 1)`. This needs no `_index`/
  // `_id`/`_source` metadata, so unlike the previous two-pass approach it works
  // on ES|QL views (e.g. query streams' `$.<name>` views), where `FROM <view>
  // METADATA _index, _id` raises `Unknown column [_index]`.
  //
  // Ask for size+offset rows so we can client-side slice the window
  // [offset, offset+size] after sorting by count.
  const categorizeQueryParams = {
    query: buildCategorizeWithSampleQuery({
      indices,
      field: messageField,
      limit: size + offset,
      samplingProbability,
    }),
    filter,
    drop_null_columns: true,
  };
  const categorizeResponse = (await esClient.esql.query(categorizeQueryParams, {
    signal,
  })) as unknown as ESQLSearchResponse;

  const window = parseCategorizeWithSampleRows(categorizeResponse)
    .sort((a, b) => b.count - a.count)
    .slice(offset, offset + size);

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
