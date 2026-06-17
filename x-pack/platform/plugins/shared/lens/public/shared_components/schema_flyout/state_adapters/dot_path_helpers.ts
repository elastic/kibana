/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Flatten a nested object into dot-path keyed entries.
 * { styling: { density: { mode: 'compact' } } } → { 'styling.density.mode': 'compact' }
 */
export const flattenToDotPaths = (
  obj: Record<string, unknown>,
  prefix = ''
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenToDotPaths(value as Record<string, unknown>, fullPath));
    } else {
      result[fullPath] = value;
    }
  }

  return result;
};

/**
 * Unflatten dot-path keyed entries back into a nested object.
 * { 'styling.density.mode': 'compact' } → { styling: { density: { mode: 'compact' } } }
 */
export const unflattenFromDotPaths = (flat: Record<string, unknown>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};

  for (const [path, value] of Object.entries(flat)) {
    const parts = path.split('.');
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== 'object' || current[part] === null) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
  }

  return result;
};
