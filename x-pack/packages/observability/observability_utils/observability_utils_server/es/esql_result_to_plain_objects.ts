/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';

export function esqlResultToPlainObjects<
  TDocument extends Record<string, any> = Record<string, unknown>
>(result: ESQLSearchResponse): TDocument[] {
  return result.values.map((row): TDocument => {
    return row.reduce<Record<string, unknown>>((acc, value, index) => {
      const column = result.columns[index];

      if (!column) {
        return acc;
      }

      const name = column.name;
      if (!acc[name]) {
        acc[name] = value;
      }

      return acc;
    }, {}) as TDocument;
  });
}
