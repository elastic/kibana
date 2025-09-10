/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';

export function uniqWithIsEqual<T extends any[]>(arr: T): T {
  return arr.reduce((dedupedArray, value) => {
    if (dedupedArray.filter((compareValue: any) => isEqual(compareValue, value)).length === 0) {
      dedupedArray.push(value);
    }
    return dedupedArray;
  }, []);
}
