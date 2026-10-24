/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';

/**
 * A missing key and an explicit `undefined` are the same value, so clearing an
 * optional field is reported and an untouched optional field is not.
 */
const valuesDiffer = (previous: unknown, next: unknown): boolean => {
  if (previous === undefined && next === undefined) {
    return false;
  }

  return !isEqual(previous, next);
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Walks both rules. A nested object is reported at the leaf that changed.
 * An array is one path: item indexes are not field names.
 */
const collectChangedPaths = (
  previous: unknown,
  next: unknown,
  path: string,
  changed: string[]
): void => {
  const previousObject = isPlainObject(previous) ? previous : undefined;
  const nextObject = isPlainObject(next) ? next : undefined;

  if (previousObject || nextObject) {
    const previousIsValue = previous != null && !previousObject;
    const nextIsValue = next != null && !nextObject;
    if (previousIsValue || nextIsValue) {
      if (valuesDiffer(previous, next)) {
        changed.push(path);
      }
      return;
    }

    const keys = new Set([...Object.keys(previousObject ?? {}), ...Object.keys(nextObject ?? {})]);
    for (const key of [...keys].sort()) {
      collectChangedPaths(
        previousObject?.[key],
        nextObject?.[key],
        path ? `${path}.${key}` : key,
        changed
      );
    }
    return;
  }

  if (path && valuesDiffer(previous, next)) {
    changed.push(path);
  }
};

/** Dotted paths whose values differ between two rule responses, in path order. */
export const collectRuleUpdatedFields = (previous: RuleResponse, next: RuleResponse): string[] => {
  const changed: string[] = [];
  collectChangedPaths(previous, next, '', changed);
  return changed;
};
