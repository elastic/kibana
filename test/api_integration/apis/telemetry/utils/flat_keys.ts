/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/*
 * Create a single-level array with strings for all the paths to values in the
 * source object, up to 3 deep. Going deeper than 3 causes a bit too much churn
 * in the tests.
 */
import _ from 'lodash';

export function flatKeys(source: Record<string, unknown>) {
  const recursivelyFlatKeys = (obj: unknown, path: string[] = [], depth = 0): string[] => {
    return depth < 3 && _.isObject(obj)
      ? Object.entries(obj).reduce(
          (acc, [k, v]) => [...acc, ...recursivelyFlatKeys(v, [...path, k], depth + 1)],
          [] as string[]
        )
      : [path.join('.')];
  };

  return _.uniq(_.flattenDeep(recursivelyFlatKeys(source))).sort((a, b) => a.localeCompare(b));
}
