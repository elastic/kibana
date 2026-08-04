/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KiTypeCount } from './http_api/ai_indices';

export const KI_OTHERS_TYPE = 'others';
export const MAX_KI_TYPE_SUMMARY_COUNT = 5;

export const groupKiTypeCountsForSummary = (
  countsByType: KiTypeCount[],
  total: number
): KiTypeCount[] => {
  const visibleSum = countsByType.reduce((sum, { count }) => sum + count, 0);

  if (visibleSum === total) {
    return countsByType;
  }

  const visibleTypes = countsByType.slice(0, MAX_KI_TYPE_SUMMARY_COUNT - 1);
  const othersCount = total - visibleTypes.reduce((sum, { count }) => sum + count, 0);

  return [...visibleTypes, { type: KI_OTHERS_TYPE, count: othersCount }];
};
