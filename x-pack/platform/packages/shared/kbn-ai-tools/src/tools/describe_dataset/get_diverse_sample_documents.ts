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
import { getSampleDocumentsEsql } from './get_sample_documents';

const MESSAGE_FIELD_CANDIDATES = ['message', 'body.text'];
const MAX_DOCS_TO_SAMPLE = 100_000;
// Over-fetch factor for the metadata-free source fetch: a representative value
// is not a unique key, so we pull several docs per value and keep the first.
const SOURCE_FETCH_PER_VALUE = 10;

interface GetDiverseSampleDocumentsOptions {
  esClient: ElasticsearchClient;
  index: string | string[];
  start: number;
  end: number;
  offset: number;
  size?: number;
  logger: Logger;
}

export async function getDiverseSampleDocuments({
  esClient,
  index,
  start,
  end,
  size = 100,
  offset,
  logger,
}: GetDiverseSampleDocumentsOptions): Promise<{ hits: Array<SearchHit<Record<string, unknown>>> }> {
  const timeRangeFilter = dateRangeQuery(start, end);
  const filter = { bool: { filter: timeRangeFilter } };
  const indices = Array.isArray(index) ? index : [index];

  const [messageField, totalDocs] = await Promise.all([
    detectMessageField({ esClient, index, start, end }),
    runEsqlCount({ esClient, indices, filter }),
  ]);

  if (totalDocs === 0) {
    return { hits: [] };
  }

  if (!messageField) {
    // The old DSL path fell back to plain random sampling when no log-message
    // text field was available. Keep that behavior, but use the ES|QL sampler so
    // this retrieval path no longer depends on search hits/fields.
    const { hits } = await getSampleDocumentsEsql({
      esClient,
      index,
      start,
      end,
      sampleSize: size,
    });
    return { hits };
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
  const categorizeResponse = (await esClient.esql.query({
    query: buildCategorizeWithSampleQuery({
      indices,
      field: messageField,
      limit: size + offset,
      samplingProbability,
    }),
    filter,
    drop_null_columns: true,
  })) as unknown as ESQLSearchResponse;

  const window = parseCategorizeWithSampleRows(categorizeResponse)
    .sort((a, b) => b.count - a.count)
    .slice(offset, offset + size);

  const sampleValues = [...new Set(window.map((row) => row.sample).filter((s) => s.length > 0))];

  if (sampleValues.length === 0) {
    return { hits: [] };
  }

  // Fetch pass: pull the full document for each representative value. Keeping
  // `METADATA _id, _source` means concrete indices return the real nested
  // `_source`, while views silently drop it and `parseEsqlSourceDocuments`
  // reconstructs the source from the projected columns. The join key is the
  // representative field value (not `_id`), so this is metadata-free too.
  const fetchResponse = (await esClient.esql.query({
    query: buildSourceFetchQuery({
      indices,
      field: messageField,
      values: sampleValues,
      limit: sampleValues.length * SOURCE_FETCH_PER_VALUE,
    }),
    filter,
    drop_null_columns: true,
  })) as unknown as ESQLSearchResponse;

  const valueToHit = new Map<string, SearchHit<Record<string, unknown>>>();
  for (const doc of parseEsqlSourceDocuments(fetchResponse)) {
    const value = readFieldValue(doc.source, messageField);
    if (value === undefined || valueToHit.has(value)) {
      continue;
    }
    valueToHit.set(value, { _index: '', _id: getEsqlDocumentId(doc), _source: doc.source });
  }

  // Emit one document per category, preserving the count-descending window order.
  const hits: Array<SearchHit<Record<string, unknown>>> = [];
  for (const row of window) {
    const hit = valueToHit.get(row.sample);
    if (hit) {
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
 * Reads the categorized field value from a parsed document. View reconstruction
 * stores projected columns under their dotted key (`source['host.name']`), while
 * a concrete index `_source` is nested (`source.host.name`), so try the dotted
 * key first and fall back to a nested lookup.
 */
function readFieldValue(source: Record<string, unknown>, field: string): string | undefined {
  const raw = field in source ? source[field] : get(source, field);
  if (raw == null) {
    return undefined;
  }
  return Array.isArray(raw) ? String(raw[0]) : String(raw);
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
  esClient: ElasticsearchClient;
  index: string | string[];
  start: number;
  end: number;
}): Promise<string | undefined> {
  const columns = await getEsqlColumnSchema({ esClient, index, start, end });
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
  esClient: ElasticsearchClient;
  indices: string[];
  filter: { bool: { filter: ReturnType<typeof dateRangeQuery> } };
}): Promise<number> {
  const response = (await esClient.esql.query({
    query: esql.from(indices).pipe`STATS total = COUNT(*)`.print('basic'),
    filter,
    drop_null_columns: true,
  })) as unknown as ESQLSearchResponse;
  const total = response.values[0]?.[0];

  return typeof total === 'number' ? total : 0;
}
