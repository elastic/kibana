/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { EsqlParam, EsqlRequestBody, EsqlResponse, FieldValue } from '../../common/types';
import { InvalidRequestError } from './errors';

type EsqlParamValue = string | number | boolean | null;

/** Converts a typed parameter into the value sent to Elasticsearch. */
export function coerceEsqlParam({ name, type, value }: EsqlParam): EsqlParamValue {
  if (type === 'number') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return null;
    }
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) {
      throw new InvalidRequestError(`Parameter "${name}" must be a number, got "${value}"`);
    }
    return parsed;
  }
  if (type === 'boolean') {
    return value.trim().toLowerCase() === 'true';
  }
  return value;
}

/** Runs an ES|QL query with named parameters. */
export async function runEsql({
  esClient,
  body: { query, params },
  dropNullColumns = false,
}: {
  esClient: ElasticsearchClient;
  body: EsqlRequestBody;
  dropNullColumns?: boolean;
}): Promise<EsqlResponse> {
  const response = await esClient.esql.query({
    query,
    ...(params.length > 0
      ? { params: params.map((param) => ({ [param.name]: coerceEsqlParam(param) })) }
      : {}),
    ...(dropNullColumns ? { drop_null_columns: true } : {}),
  });

  return {
    took: response.took,
    isPartial: response.is_partial ?? false,
    columns: response.columns.map(({ name, type }) => ({ name, type })),
    values: response.values as FieldValue[][],
  };
}
