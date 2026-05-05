/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isArray, isObject } from 'lodash/fp';
import type { ECSMapping } from '@kbn/osquery-io-ts-types';
import type { ResultEdges } from '../search_strategy';

/**
 * Resolves a dot-notation path from a source object.
 * Uses lodash `get` which resolves both nested paths (e.g., source.process.pid)
 * and flat dot-notation keys (e.g., source['process.pid']), preferring flat keys
 * when both exist. Falls back to a direct property lookup if `get` returns undefined.
 */
export function getNestedOrFlat(path: string, source: unknown): unknown {
  const nested = get(path, source);
  if (nested !== undefined) return nested;

  if (source && typeof source === 'object') {
    return (source as Record<string, unknown>)[path];
  }

  return undefined;
}

export function flattenOsqueryHit(
  edge: ResultEdges[number],
  ecsMapping?: ECSMapping
): Record<string, unknown> {
  const flattened: Record<string, unknown> = {};

  if (edge.fields) {
    for (const [key, value] of Object.entries(edge.fields)) {
      flattened[key] = isArray(value) && value.length === 1 ? value[0] : value;
    }
  }

  const agentFields = ['agent.name', 'agent.id'] as const;
  for (const field of agentFields) {
    if (flattened[field] !== undefined) continue;
    const value = getNestedOrFlat(field, edge._source);
    if (value !== undefined) {
      flattened[field] = isArray(value) && value.length === 1 ? value[0] : value;
    }
  }

  if (ecsMapping && edge._source) {
    const ecsMappingKeys = Object.keys(ecsMapping);
    for (const key of ecsMappingKeys) {
      const sourceValue = getNestedOrFlat(key, edge._source);
      if (sourceValue !== undefined) {
        if (isArray(sourceValue) || isObject(sourceValue)) {
          try {
            flattened[key] = JSON.stringify(sourceValue, null, 2);
          } catch {
            flattened[key] = sourceValue;
          }
        } else {
          flattened[key] = sourceValue;
        }
      }
    }
  }

  return flattened;
}
