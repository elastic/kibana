/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { dateRangeQuery } from '@kbn/es-query';

const NO_FIELDS_SENTINEL = '<no-fields>';

export interface EsqlColumnSchema {
  name: string;
  type: string;
  originalTypes?: string[];
}

export interface GetEsqlColumnSchemaParams {
  esClient: ElasticsearchClient;
  index: string | string[];
  start?: number;
  end?: number;
  signal: AbortSignal;
}

export async function getEsqlColumnSchema({
  esClient,
  index,
  start,
  end,
  signal,
}: GetEsqlColumnSchemaParams): Promise<EsqlColumnSchema[]> {
  const indices = Array.isArray(index) ? index : [index];
  const filter =
    start !== undefined && end !== undefined
      ? { bool: { filter: dateRangeQuery(start, end) } }
      : undefined;

  const queryParams = {
    query: esql.from(indices).limit(0).print('basic'),
    ...(filter ? { filter } : {}),
  };
  const response = (await esClient.esql.query(queryParams, {
    signal,
  })) as unknown as ESQLSearchResponse;

  return parseColumns(response);
}

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
      },
    ];
  });
}
