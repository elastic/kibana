/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INLINE_ESQL_QUERY_REGEX } from '@kbn/inference-plugin/common/tasks/nl_to_esql/constants';
import type { EsqlResponse } from '../steps/execute_esql';

/**
 * Converts an ES|QL /_query columnar response to a JSON representation
 */
export const esqlResponseToJson = (esql: EsqlResponse): Array<Record<string, any>> => {
  const results: Array<Record<string, any>> = [];

  const { columns, values } = esql;
  for (const item of values) {
    const entry: Record<string, any> = {};
    for (let i = 0; i < columns.length; i++) {
      entry[columns[i].name] = item[i];
    }
    results.push(entry);
  }

  return results;
};

export const extractEsqlQueries = (message: string): string[] => {
  return Array.from(message.matchAll(INLINE_ESQL_QUERY_REGEX)).map(([match, query]) => query);
};
