/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const SHORT_HASH_LIMIT = 14;

export const shortGroupHash = (groupHash: string): string =>
  groupHash.length <= SHORT_HASH_LIMIT ? groupHash : `${groupHash.slice(0, 12)}…`;

export const formatSeriesLabel = (
  groupHash: string,
  groupingValues: Record<string, string | null> | null | undefined
): string => {
  if (!groupingValues) return shortGroupHash(groupHash);
  const entries = Object.entries(groupingValues).filter(([, v]) => v != null && v !== '');
  if (entries.length === 0) return shortGroupHash(groupHash);
  return entries
    .map(([field, value]) => {
      const lastSegment = field.split('.').pop() ?? field;
      return `${lastSegment}=${value as string}`;
    })
    .join(' · ');
};
