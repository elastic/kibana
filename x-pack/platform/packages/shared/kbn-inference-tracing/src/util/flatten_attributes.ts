/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttributeValue } from '@opentelemetry/api';
import { isArray, isPlainObject } from 'lodash';

export function flattenAttributes(
  obj: Record<string, any>,
  parentKey: string = ''
): Record<string, AttributeValue> {
  const result: Record<string, AttributeValue> = {};

  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
      const value = obj[key];
      const newKey = parentKey ? `${parentKey}.${key}` : key;
      if (isPlainObject(value) || isArray(value)) {
        Object.assign(result, flattenAttributes(value, newKey));
      } else {
        result[newKey] = value;
      }
    }
  }
  return result;
}
