/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import { columnPath } from './esql_categorize';
import { esqlTimeRange } from './esql_time_range';

const NO_FIELDS_SENTINEL = '<no-fields>';
// NULLIFY's type for a requested column that no index maps; set by mappings, not values.
const UNMAPPED_COLUMN_TYPE = 'null';

const isTracedEsClient = (
  esClient: ElasticsearchClient | TracedElasticsearchClient
): esClient is TracedElasticsearchClient => typeof esClient.esql === 'function';

export interface EsqlColumnSchema {
  name: string;
  type: string;
  originalTypes?: string[];
  /** ES's `suggested_cast` for a union-typed column. */
  suggestedCast?: string;
}

export interface GetEsqlColumnSchemaParams {
  esClient: ElasticsearchClient | TracedElasticsearchClient;
  index: string | string[];
  start?: number;
  end?: number;
  /** Probes only these columns instead of the whole schema; the unmapped ones are left out. */
  fields?: string[];
  signal?: AbortSignal;
}

export async function getEsqlColumnSchema({
  esClient,
  index,
  start,
  end,
  fields,
  signal,
}: GetEsqlColumnSchemaParams): Promise<EsqlColumnSchema[]> {
  const indices = Array.isArray(index) ? index : [index];
  const queryParams = { query: buildSchemaQuery(indices, fields, { start, end }) };
  const response = isTracedEsClient(esClient)
    ? ((await esClient.esql(
        'get_esql_column_schema',
        queryParams
      )) as unknown as ESQLSearchResponse)
    : ((await esClient.esql.query(queryParams, {
        signal,
      })) as unknown as ESQLSearchResponse);

  const columns = parseColumns(response);
  return fields?.length ? columns.filter(({ type }) => type !== UNMAPPED_COLUMN_TYPE) : columns;
}

// Inline time range: a request `filter` on an ES|QL view takes minutes on very wide schemas.
const buildSchemaQuery = (
  indices: string[],
  fields: string[] = [],
  { start, end }: { start?: number; end?: number }
): string => {
  const source =
    start !== undefined && end !== undefined
      ? esql.from(indices).where`${esqlTimeRange(start, end)}`
      : esql.from(indices);

  const [field, ...otherFields] = fields.map(columnPath);
  if (field === undefined) {
    return source.limit(0).print('basic');
  }

  // Without NULLIFY, a column that no index maps fails the whole probe.
  return source
    .keep(field, ...otherFields)
    .limit(0)
    .addSetCommand('unmapped_fields', 'NULLIFY')
    .print('basic');
};

function parseColumns(response: ESQLSearchResponse): EsqlColumnSchema[] {
  return response.columns.flatMap((column) => {
    if (column.name === NO_FIELDS_SENTINEL) {
      return [];
    }

    return [
      {
        name: column.name,
        type: column.type,
        ...(column.original_types ? { originalTypes: column.original_types } : {}),
        ...(column.suggested_cast ? { suggestedCast: column.suggested_cast } : {}),
      },
    ];
  });
}
