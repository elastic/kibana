/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlEsqlColumnInfo } from '@elastic/elasticsearch/lib/api/types';

const formatColumns = (columns: EsqlEsqlColumnInfo[]): string =>
  columns.map(({ name, type }) => `- "${name}" (${type})`).join('\n');

export const formatColumnsBlock = (
  columns: EsqlEsqlColumnInfo[] | undefined,
  query: string
): string => {
  if (columns === undefined) {
    return `No column information is available; infer fields from the ES|QL query: ${query}`;
  }

  const listed = formatColumns(columns);
  return `Columns available in the data (reference these EXACT names):
<columns>${listed ? `\n${listed}` : ''}
</columns>`;
};
