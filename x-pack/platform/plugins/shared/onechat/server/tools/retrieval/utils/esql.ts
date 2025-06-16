/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlEsqlColumnInfo, FieldValue } from '@elastic/elasticsearch/lib/api/types';

export interface EsqlResponse {
  columns: EsqlEsqlColumnInfo[];
  values: FieldValue[][];
}

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
