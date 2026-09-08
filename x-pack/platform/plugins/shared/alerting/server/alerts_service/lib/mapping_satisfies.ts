/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { isEqual, isPlainObject } from 'lodash';

const IGNORED_MAPPING_KEYS = new Set(['_meta']);

const normalizeScalar = (value: unknown): unknown => {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return value;
};

const doesLiveSatisfyTarget = (live: unknown, target: unknown): boolean => {
  const normalizedTarget = normalizeScalar(target);
  const normalizedLive = normalizeScalar(live);

  if (normalizedTarget === normalizedLive) {
    return true;
  }
  if (normalizedTarget === undefined) {
    return true;
  }
  if (normalizedLive === undefined || normalizedLive === null) {
    return false;
  }
  if (Array.isArray(normalizedTarget)) {
    return Array.isArray(normalizedLive) && isEqual(normalizedLive, normalizedTarget);
  }
  if (isPlainObject(normalizedTarget) && isPlainObject(normalizedLive)) {
    return Object.entries(normalizedTarget as Record<string, unknown>).every(([key, value]) => {
      if (IGNORED_MAPPING_KEYS.has(key)) {
        return true;
      }
      return doesLiveSatisfyTarget((normalizedLive as Record<string, unknown>)[key], value);
    });
  }
  return isEqual(normalizedLive, normalizedTarget);
};

/**
 * True when every target mapping constraint is already present on the live mapping.
 * Extra live fields (e.g. dynamic fields) are allowed; `_meta` is ignored.
 */
export const doesLiveMappingSatisfyTarget = (
  live: MappingTypeMapping | undefined,
  target: MappingTypeMapping
): boolean => {
  if (live === undefined) {
    return false;
  }
  return doesLiveSatisfyTarget(live, target);
};
