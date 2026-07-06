/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const SHORT_HASH_LENGTH = 7;

const nonEmptyEntries = (groupingValues: Record<string, string | null>) =>
  Object.entries(groupingValues).filter((entry): entry is [string, string] => Boolean(entry[1]));

/** Full `field=value · …` label, used as tooltip content. */
export const formatSeriesLabel = (
  groupHash: string,
  groupingValues: Record<string, string | null> | null | undefined
): string => {
  if (!groupingValues) return groupHash.slice(0, SHORT_HASH_LENGTH);
  const entries = nonEmptyEntries(groupingValues);
  if (entries.length === 0) return groupHash.slice(0, SHORT_HASH_LENGTH);
  return entries
    .map(([field, value]) => {
      const lastSegment = field.split('.').pop() ?? field;
      return `${lastSegment}=${value}`;
    })
    .join(' · ');
};

/** Values-only `value · …` label, used as the visible truncated text in the gantt column. */
export const formatSeriesLabelValues = (
  groupHash: string,
  groupingValues: Record<string, string | null> | null | undefined
): string => {
  if (!groupingValues) return groupHash.slice(0, SHORT_HASH_LENGTH);
  const values = nonEmptyEntries(groupingValues).map(([, v]) => v);
  if (values.length === 0) return groupHash.slice(0, SHORT_HASH_LENGTH);
  return values.join(' · ');
};
