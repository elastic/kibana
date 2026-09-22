/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { esql } from '@elastic/esql';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { dateRangeQuery } from '@kbn/es-query';
import type { Logger } from '@kbn/logging';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import { get } from 'lodash';
import { getEsqlColumnSchema } from '../../utils/get_esql_column_schema';
import {
  categorizeWithNoiseExclusion,
  columnPath,
  type CategorizeWithSampleRow,
} from '../../utils/esql_categorize';
import {
  getEsqlDocumentId,
  parseEsqlSourceDocuments,
} from '../../utils/parse_esql_source_documents';

const MESSAGE_FIELD_CANDIDATES = ['message', 'body.text'];
const MAX_DOCS_TO_SAMPLE = 100_000;
// A representative value is not a unique key, so over-fetch per value and keep the first.
const SOURCE_FETCH_PER_VALUE = 10;

interface GetDiverseSampleDocumentsOptions {
  esClient: TracedElasticsearchClient;
  index: string | string[];
  start: number;
  end: number;
  iteration: number;
  size?: number;
  logger: Logger;
}

export async function getDiverseSampleDocuments({
  esClient,
  index,
  start,
  end,
  size = 100,
  iteration,
  logger,
}: GetDiverseSampleDocumentsOptions): Promise<{ hits: Array<SearchHit<Record<string, unknown>>> }> {
  const timeRangeFilter = dateRangeQuery(start, end);
  const filter = { bool: { filter: timeRangeFilter } };
  const indices = Array.isArray(index) ? index : [index];

  const [messageField, totalDocs] = await Promise.all([
    detectMessageField({ esClient, index, start, end }),
    runEsqlCount({ esClient, indices, filter }),
  ]);

  if (totalDocs === 0 || !messageField) {
    // Nothing to categorize; the caller's random sampling arm backfills this case.
    return { hits: [] };
  }

  const samplingProbability =
    MAX_DOCS_TO_SAMPLE / totalDocs < 0.5 ? MAX_DOCS_TO_SAMPLE / totalDocs : 1;

  const rows = await categorizeWithNoiseExclusion({
    esClient,
    indices,
    field: messageField,
    total: totalDocs,
    samplingProbability,
    filter,
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
  });

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

// Stable ordering by pattern identity, so sampling jitter on near-equal counts
// can't change which representative an iteration picks.
const hashPattern = (value: string): number => {
  const hashMultiplier = 31;
  const hashModulus = 2 ** 31 - 1;

  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * hashMultiplier + value.charCodeAt(i)) % hashModulus;
  }
  return hash;
};

/**
 * Cursor-free window of patterns for one iteration: rank by frequency, cut into
 * `size` bands, take one pattern per band so the window spans common→rare.
 * `iteration` rotates the within-band pick, advancing coverage without a
 * positional cursor; within-band order is {@link hashPattern} for jitter stability.
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
 * Maps each representative value to its full document. Join key is the field value,
 * not `_id`, so views that drop `_source` work via `parseEsqlSourceDocuments`. A
 * value isn't unique, so one round's `LIMIT` can starve some; re-query the still
 * missing ones each round until none resolve (`pending` shrinks, so it terminates).
 */
async function fetchRepresentativeDocuments({
  esClient,
  indices,
  field,
  sampleValues,
  filter,
}: {
  esClient: TracedElasticsearchClient;
  indices: string[];
  field: string;
  sampleValues: string[];
  filter: { bool: { filter: ReturnType<typeof dateRangeQuery> } };
}): Promise<Map<string, SearchHit<Record<string, unknown>>>> {
  const valueToHit = new Map<string, SearchHit<Record<string, unknown>>>();
  let pending = sampleValues;

  while (pending.length > 0) {
    const fetchResponse = (await esClient.esql('diverse_sample_fetch_sources', {
      query: buildSourceFetchQuery({
        indices,
        field,
        values: pending,
        limit: pending.length * SOURCE_FETCH_PER_VALUE,
      }),
      filter,
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
}: {
  esClient: TracedElasticsearchClient;
  index: string | string[];
  start: number;
  end: number;
}): Promise<string | undefined> {
  // Traced esql() hardcodes drop_null_columns: true, which prunes all columns from a LIMIT 0 probe.
  const columns = await getEsqlColumnSchema({ esClient: esClient.client, index, start, end });
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
}: {
  esClient: TracedElasticsearchClient;
  indices: string[];
  filter: { bool: { filter: ReturnType<typeof dateRangeQuery> } };
}): Promise<number> {
  const response = (await esClient.esql('diverse_sample_count', {
    query: esql.from(indices).pipe`STATS total = COUNT(*)`.print('basic'),
    filter,
  })) as unknown as ESQLSearchResponse;
  const total = response.values[0]?.[0];

  return typeof total === 'number' ? total : 0;
}
