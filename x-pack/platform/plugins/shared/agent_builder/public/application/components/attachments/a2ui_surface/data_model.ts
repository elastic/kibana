/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DynamicValue } from '@kbn/agent-builder-common/attachments';

/**
 * Resolves a JSON Pointer (RFC 6901) against a data model object.
 *
 * Returns `undefined` if the path cannot be resolved.
 */
export const resolveJsonPointer = (
  dataModel: Record<string, unknown>,
  pointer: string
): unknown => {
  if (!pointer.startsWith('/')) {
    return undefined;
  }

  const segments = pointer
    .substring(1)
    .split('/')
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));

  let current: unknown = dataModel;
  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current === 'object') {
      if (Array.isArray(current)) {
        const index = parseInt(segment, 10);
        if (isNaN(index) || index < 0 || index >= current.length) {
          return undefined;
        }
        current = current[index];
      } else {
        current = (current as Record<string, unknown>)[segment];
      }
    } else {
      return undefined;
    }
  }

  return current;
};

/**
 * Resolves a DynamicValue: returns the literal if it's a direct value,
 * or resolves the JSON Pointer path against the data model.
 */
export const resolveDynamicValue = <T>(
  dynamicValue: DynamicValue<T> | undefined,
  dataModel: Record<string, unknown>
): T | string | undefined => {
  if (dynamicValue === undefined || dynamicValue === null) {
    return undefined;
  }

  if (typeof dynamicValue === 'object' && 'path' in dynamicValue) {
    const resolved = resolveJsonPointer(dataModel, dynamicValue.path);
    if (resolved === undefined || resolved === null) {
      return '';
    }
    if (typeof resolved === 'object') {
      return JSON.stringify(resolved);
    }
    return String(resolved);
  }

  return dynamicValue;
};

/**
 * Resolves a DynamicValue to a string, falling back to empty string.
 */
export const resolveDynamicString = (
  dynamicValue: DynamicValue<string> | undefined,
  dataModel: Record<string, unknown>
): string => {
  const resolved = resolveDynamicValue(dynamicValue, dataModel);
  return typeof resolved === 'string' ? resolved : '';
};

/**
 * Resolves a data_path and returns the array of records at that path,
 * or an empty array if unresolvable.
 */
export const resolveDataPath = (
  dataPath: string | undefined,
  dataModel: Record<string, unknown>
): Record<string, unknown>[] => {
  if (!dataPath) return [];
  const resolved = resolveJsonPointer(dataModel, dataPath);
  if (Array.isArray(resolved)) {
    return resolved as Record<string, unknown>[];
  }
  return [];
};
