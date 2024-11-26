/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import { unflattenObject } from '@kbn/observability-utils-common/object/unflatten_object';

export function esqlResultToPlainObjects<TDocument = unknown>(
  result: ESQLSearchResponse
): TDocument[] {
  return result.values.map((row) => {
    return unflattenObject(
      row.reduce<Record<string, any>>((acc, value, index) => {
        const column = result.columns[index];

        if (!column) {
          return acc;
        }

        // Removes the type suffix from the column name
        const name = column.name.replace(/\.(text|keyword)$/, '');
        if (!acc[name]) {
          acc[name] = value;
        }

        return acc;
      }, {})
    ) as TDocument;
  });
}
