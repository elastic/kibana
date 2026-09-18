/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlEsqlColumnInfo } from '@elastic/elasticsearch/lib/api/types';

export const formatColumnsBlock = (
  columns: EsqlEsqlColumnInfo[] | undefined,
  query: string
): string => {
  if (columns === undefined) {
    return `No column information is available; infer fields from the ES|QL query: ${query}`;
  }

  const listed = columns.map(({ name, type }) => `- ${JSON.stringify(name)} (${type})`).join('\n');
  return `Bind only these executed result columns, using their exact names:
<columns>${listed ? `\n${listed}` : ''}
</columns>`;
};
