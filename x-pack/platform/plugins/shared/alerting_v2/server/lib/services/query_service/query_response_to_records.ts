/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import { set } from '@kbn/safer-lodash-set';

export function queryResponseToRecords<T extends Record<string, any>>(
  response: ESQLSearchResponse
): T[] {
  const objects: T[] = [];

  if (response.columns.length === 0 || response.values.length === 0) {
    return [];
  }

  for (const row of response.values) {
    const object: T = {} as T;

    for (const [columnIndex, value] of row.entries()) {
      const columnName = response.columns[columnIndex]?.name;

      if (columnName) {
        set(object, columnName.split('.'), value);
      }
    }

    objects.push(object);
  }

  return objects;
}
