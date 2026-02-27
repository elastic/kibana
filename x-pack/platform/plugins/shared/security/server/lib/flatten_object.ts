/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact, isObject } from 'lodash';

// Slightly modified to have key/value exposed as Object.
export const flattenObject = (
  item: Record<PropertyKey, unknown> | null | undefined,
  accDefault: Record<PropertyKey, unknown> = {},
  parentKey?: string
): Record<PropertyKey, unknown> => {
  if (item) {
    const isArrayWithSingleValue = Array.isArray(item) && item.length === 1;
    return Object.keys(item)
      .sort()
      .reduce<Record<PropertyKey, unknown>>((acc, key) => {
        const childKey = isArrayWithSingleValue ? '' : key;
        const currentKey = compact([parentKey, childKey]).join('.');

        const value = item[key];
        if (isObject(value)) {
          flattenObject(value as Record<PropertyKey, unknown>, acc, currentKey);
        } else {
          acc[currentKey] = value;
        }

        return acc;
      }, accDefault);
  }
  return {};
};
