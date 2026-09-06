/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNonLocalIndexName } from '@kbn/es-query';

/** Internal ES|QL view names use the `$.` prefix (alerting v2, Streams, Fleet, user views). */
export const INTERNAL_ESQL_VIEW_INDEX_PREFIX = '$.';

/**
 * Unqualified exclusion. On CPS the same FROM is evaluated on every project the
 * space NPRE routes to, so this applies to origin and every linked project.
 */
export const INTERNAL_ESQL_VIEW_EXCLUSION_LOCAL = '-$.*';

/**
 * Remote-cluster wildcard exclusion. ES requires `cluster:-pattern` (not
 * `-cluster:pattern`). `*` is the cluster wildcard, so this covers every CCS
 * remote / linked-project alias without naming them.
 */
export const INTERNAL_ESQL_VIEW_EXCLUSION_REMOTE = '*:-$.*';

export const INTERNAL_ESQL_VIEW_FROM_EXCLUSIONS: readonly string[] = [
  INTERNAL_ESQL_VIEW_EXCLUSION_LOCAL,
  INTERNAL_ESQL_VIEW_EXCLUSION_REMOTE,
];

/** True when `pattern` is a positive (include) ES|QL view, including `cluster:$.…`. */
export function isPositiveInternalEsqlViewIndexPattern(pattern: string): boolean {
  if (pattern.startsWith('-')) {
    return false;
  }
  if (isNonLocalIndexName(pattern)) {
    const indexExpression = pattern.slice(pattern.indexOf(':') + 1);
    if (indexExpression.startsWith('-')) {
      return false;
    }
    return indexExpression.startsWith(INTERNAL_ESQL_VIEW_INDEX_PREFIX);
  }
  return pattern.startsWith(INTERNAL_ESQL_VIEW_INDEX_PREFIX);
}

/**
 * Drop view includes, then append origin + any-remote view negations after the
 * remaining patterns so ES|QL subtraction actually applies.
 */
export function withInternalEsqlViewExclusions(indexPatterns: string[]): string[] {
  const withoutViewIncludes = indexPatterns.filter(
    (pattern) => !isPositiveInternalEsqlViewIndexPattern(pattern)
  );
  const alreadyPresent = new Set(withoutViewIncludes);
  return [
    ...withoutViewIncludes,
    ...INTERNAL_ESQL_VIEW_FROM_EXCLUSIONS.filter((exclusion) => !alreadyPresent.has(exclusion)),
  ];
}
