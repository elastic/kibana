/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TargetType } from '../../types';

const normalizeQueryValue = (value: string) => value.trim().toLowerCase();
const normalizePatternValue = (value: string) => value.trim();

export const targetLookupQueryKeys = {
  root: ['anonymizationTargetLookup'] as const,

  dataViewsList: () => [...targetLookupQueryKeys.root, 'dataViewsList'] as const,

  dataViewById: (dataViewId: string) =>
    [...targetLookupQueryKeys.root, 'dataViewById', dataViewId] as const,

  resolveIndex: (query: string, targetType: TargetType) =>
    [
      ...targetLookupQueryKeys.root,
      'resolveIndex',
      targetType,
      normalizeQueryValue(query),
    ] as const,

  fieldsForWildcard: (pattern: string) =>
    [...targetLookupQueryKeys.root, 'fieldsForWildcard', normalizePatternValue(pattern)] as const,
};
