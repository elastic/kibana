/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPattern } from 'src/plugins/data/public';
import { IndexPatternProvider } from '../types';

export function createCachedIndexPatternProvider(
  indexPatternGetter: (id: string) => Promise<IndexPattern>
): IndexPatternProvider {
  const cache = new Map<string, IndexPattern>();

  return {
    get: async (id: string) => {
      if (!cache.has(id)) {
        cache.set(id, await indexPatternGetter(id));
      }
      return Promise.resolve(cache.get(id)!);
    },
  };
}
