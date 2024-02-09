/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';

export const matchAllQuery = { match_all: {} };

export function isMatchAllQuery(query: unknown): boolean {
  return (
    isPopulatedObject(query, ['match_all']) &&
    typeof query.match_all === 'object' &&
    query.match_all !== null &&
    Object.keys(query.match_all).length === 0
  );
}
