/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateQuery } from '@kbn/esql-language';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse, ESQLRow } from '@kbn/es-types';
import { esFieldTypeToKibanaFieldType } from '@kbn/field-types';
import type { DatatableColumn, DatatableColumnType } from '@kbn/expressions-plugin/common';
import { trace } from '@opentelemetry/api';
import { BasicPrettyPrinter, Parser } from '@kbn/esql-language';
import { formatQueryWithErrors } from './format_query_with_errors';

export interface QueryValidateRunOutput {
  columns?: DatatableColumn[];
  rows?: ESQLRow[];
  error?: Error;
  errorMessages?: string[];
}

export async function runAndValidateEsqlQuery({
  query,
  client,
}: {
  query: string;
  client: ElasticsearchClient;
}): Promise<QueryValidateRunOutput> {
  // Format the query for readability before validation and execution
  let formattedQuery: string;
  try {
    const parser = Parser.create(query);
    formattedQuery = BasicPrettyPrinter.print(parser.parse().root, { multiline: true });
  } catch (e) {
    // Fallback to original query if parsing fails
    formattedQuery = query;
  }

  const { errors } = await validateQuery(formattedQuery);

  const errorMessages = formatQueryWithErrors(formattedQuery, errors);

  return client.transport
    .request({
      method: 'POST',
      path: '_query',
      body: {
        query: formattedQuery,
      },
    })
    .then((res) => {
      const esqlResponse = res as ESQLSearchResponse;

      const columns =
        esqlResponse.columns?.map(({ name, type }) => ({
          id: name,
          name,
          meta: { type: esFieldTypeToKibanaFieldType(type) as DatatableColumnType },
        })) ?? [];

      return { columns, rows: esqlResponse.values };
    })
    .catch((error) => {
      trace.getActiveSpan()?.recordException(error);
      return {
        error,
        ...(errorMessages.length ? { errorMessages } : {}),
      };
    });
}
