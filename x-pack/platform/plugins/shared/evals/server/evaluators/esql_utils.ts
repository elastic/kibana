/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';

export const rowsFromEsqlResponse = <T extends Record<string, unknown> = Record<string, unknown>>(
  response: ESQLSearchResponse
): T[] => {
  const columns = response.columns ?? [];
  const values = response.values ?? [];

  return values.map((row) => {
    return columns.reduce<Record<string, unknown>>((acc, column, columnIndex) => {
      acc[column.name] = row[columnIndex];
      return acc;
    }, {}) as T;
  });
};
