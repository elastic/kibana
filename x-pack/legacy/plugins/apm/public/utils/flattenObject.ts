/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compact, isObject, isEmpty } from 'lodash';

export interface KeyValuePair {
  key: string;
  value: unknown;
}

export const flattenObject = (
  item: Record<string, any>,
  parentKey?: string
): KeyValuePair[] => {
  if (isEmpty(item)) {
    return [];
  }
  const isArrayWithSingleValue = Array.isArray(item) && item.length === 1;
  return Object.keys(item)
    .sort()
    .reduce((acc: KeyValuePair[], key) => {
      const childKey = isArrayWithSingleValue ? '' : key;
      const currentKey = compact([parentKey, childKey]).join('.');
      if (isObject(item[key])) {
        return acc.concat(flattenObject(item[key], currentKey));
      } else {
        acc.push({ key: currentKey, value: item[key] });
        return acc;
      }
    }, []);
};
