/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAP_DIRECTIVE } from '@kbn/workflows-extensions/common';

/** True when the value has a `$map` key, at any depth, in an object or inside a list. */
export const containsMapDirective = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(containsMapDirective);
  if (value === null || typeof value !== 'object') return false;
  return Object.entries(value).some(
    ([key, entry]) => key === MAP_DIRECTIVE || containsMapDirective(entry)
  );
};
