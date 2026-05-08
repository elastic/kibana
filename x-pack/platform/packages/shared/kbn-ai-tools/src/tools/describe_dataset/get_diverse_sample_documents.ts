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
import { getEsqlColumnSchema } from '../../utils/get_esql_column_schema';
import { getSampleDocumentsEsql } from './get_sample_documents';

const MESSAGE_FIELD_CANDIDATES = ['message', 'body.text'];
const MAX_DOCS_TO_SAMPLE = 100_000;

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

  // ES|QL cannot do `CATEGORIZE(...)` and return a coherent full source
  // document from the same grouped row in one query. Per-field aggregations like
  // TOP/SAMPLE/VALUES can mix values from different documents, so pass 1 only
  // chooses one representative document key per category.
  //
  // The SAMPLE probability mirrors the previous DSL random_sampler cap:
  // categorizing every document in a busy stream is expensive, and this helper
  // only needs representative document diversity, not exact category counts.
  const samplingProbability =
    MAX_DOCS_TO_SAMPLE / totalDocs < 0.5 ? MAX_DOCS_TO_SAMPLE / totalDocs : 1;
  const pass1Response = (await esClient.esql.query({
    query: buildPass1Query({ indices, messageField, size, offset, samplingProbability }),
    filter,
    drop_null_columns: true,
  })) as unknown as ESQLSearchResponse;
  const window = parsePass1Rows(pass1Response)
    .sort((a, b) => b.count - a.count)
    .slice(offset, offset + size);

  if (window.length === 0) {
    return { hits: [] };
  }

  // Pass 2 fetches the actual `_source` for the keys selected above. Joining the
  // full source client-side is what preserves per-document coherence across all
  // fields in the returned sample.
  const pass2Response = (await esClient.esql.query({
    query: buildPass2Query(
      indices,
      window.map(({ docKey }) => docKey)
    ),
    filter,
    drop_null_columns: true,
  })) as unknown as ESQLSearchResponse;
  const keyToHit = new Map(
    parsePass2Hits(pass2Response).map((hit) => [`${hit._index}:${hit._id}`, hit])
  );
  const hits: Array<SearchHit<Record<string, unknown>>> = [];

  for (const row of window) {
    const hit = keyToHit.get(row.docKey);
    if (!hit) {
      logger.warn(
        `Diverse sampling: doc ${row.docKey} not found in pass-2 fetch (deleted between passes); skipping pattern.`
      );
      continue;
    }
    hits.push(hit);
  }

  return { hits };
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

function columnPath(field: string): string | string[] {
  return field.includes('.') ? field.split('.') : field;
}

/**
 * Pass 1 categorizes the message field and returns only category metadata plus a
 * representative key. The key includes `_index` because `_id` is unique only
 * within an index, and Streams queries often span backing indices.
 */
function buildPass1Query({
  indices,
  messageField,
  size,
  offset,
  samplingProbability,
}: {
  indices: string[];
  messageField: string;
  size: number;
  offset: number;
  samplingProbability: number;
}): string {
  // `TOP(doc_key, 1, "desc")` intentionally means "any stable representative".
  // Diverse sampling does not require newest/latest semantics; it only needs one
  // coherent document per category.
  let query = esql.from(indices, ['_index', '_id']).pipe`EVAL doc_key = CONCAT(${esql.col(
    '_index'
  )}, ":", ${esql.col('_id')})`;

  if (samplingProbability < 1) {
    query = query.pipe`SAMPLE ${esql.num(samplingProbability)}`;
  }

  return query.pipe`STATS representative_key = TOP(doc_key, 1, "desc"), count = COUNT(*) BY pattern = CATEGORIZE(${esql.col(
    columnPath(messageField)
  )})`
    .sort([['count'], 'DESC', ''])
    .limit(size + offset)
    .print('basic');
}

/**
 * Fetches `_source` for the exact composite keys chosen by pass 1. We do not use
 * getSampleDocumentsEsql here because that helper parses hits with `_index: ''`,
 * which would make a multi-index `_id` collision indistinguishable.
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
    // ES|QL currently returns TOP(..., 1) as a scalar, but accepting a single-item
    // array makes this parser tolerant of response-shape differences across ES
    // snapshots without changing the query contract.
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
