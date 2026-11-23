/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import queryString from 'query-string';
export interface EsqlResponse {
  columns: Array<{ name: string }>;
  values: unknown[][];
}

/** Values of one named column across an ES|QL `{ columns, values }` response. */
export const columnValues = ({ columns, values }: EsqlResponse, name: string): unknown[] => {
  const index = columns.findIndex((column) => column.name === name);
  return values.map((row) => row[index]);
};

/** Document fragment scoping a KI to a space, matching the `permissions.kibana.privileges` mapping. */
export const spaceScoped = (spaceId: string) => ({
  permissions: { kibana: { privileges: [{ space: spaceId }] } },
});

/** Request body that registers an AI index backed by `dest`, with no automations or sources. */
export const registerAiIndex = (
  id: string,
  dest: { type: 'index' | 'data_stream'; value: string }
) => ({
  id,
  dest,
  automations: [],
  sources: [],
});

export const withQuery = (path: string, query: Record<string, string | number>) => {
  const search = queryString.stringify(query, { arrayFormat: 'none' });
  return search ? `${path}?${search}` : path;
};
