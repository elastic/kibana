/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

/** Makes `| LIMIT 0` query validation succeed with the given output columns. */
export const mockEsqlColumns = (
  esClient: IScopedClusterClient,
  columns: Array<{ name: string; type: string }>
): void => {
  jest.mocked(esClient.asCurrentUser.esql.query).mockResolvedValue({ columns, values: [] });
};

/** Makes the source index report the given `date` fields. */
export const mockDateFields = (esClient: IScopedClusterClient, fields: string[]): void => {
  jest.mocked(esClient.asCurrentUser.fieldCaps).mockResolvedValue({
    indices: ['metrics-1'],
    fields: Object.fromEntries(
      fields.map((field) => [
        field,
        { date: { type: 'date', metadata_field: false, searchable: true, aggregatable: true } },
      ])
    ),
  });
};
