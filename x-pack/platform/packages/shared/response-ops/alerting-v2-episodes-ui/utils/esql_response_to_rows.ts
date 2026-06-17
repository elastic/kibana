/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';

/**
 * Converts an ES|QL tabular response into plain row objects keyed by column name.
 *
 * Pass a generic type parameter to get typed rows instead of `Record<string, unknown>`.
 */
export const esqlResponseToObjectRows = <T extends object = Record<string, unknown>>(
  response: ESQLSearchResponse
): T[] => {
  const names = response.columns.map((c) => c.name);
  return response.values.map((row) => {
    const obj: Record<string, unknown> = {};
    names.forEach((name, i) => {
      obj[name] = row[i];
    });
    return obj as T;
  });
};
