/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { MAX_QUERIES } from './constants';

export const injectAnalyzeWildcard = (query: QueryDslQueryContainer): void => {
  if (!query) {
    return;
  }

  let queriesCount = 0;
  const stack: QueryDslQueryContainer[] = [query];

  while (stack.length > 0) {
    queriesCount = queriesCount + 1;

    if (queriesCount > MAX_QUERIES) {
      throw new Error('Query is too deeply nested');
    }

    const current = stack.pop();

    if (Array.isArray(current)) {
      for (const child of current) {
        stack.push(child);
      }
    } else if (typeof current === 'object' && current !== null) {
      for (const [key, value] of Object.entries(current)) {
        if (key !== 'query_string') {
          stack.push(value);
        } else if (typeof value.query === 'string' && value.query.includes('*')) {
          value.analyze_wildcard = true;
        }
      }
    }
  }
};
