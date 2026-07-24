/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Fleet-owned indices (`.fleet-actions*`, `.fleet-actions-results*`, `.fleet-agents*`)
 * are excluded from CPS routing and the request user holds no privileges on them, so
 * reads must stay on the internal client (origin-only).
 */
export const isFleetIndex = (index: string): boolean => index.includes('fleet');

/**
 * Osquery-owned indices: action metadata (`.logs-osquery_manager.actions-*`), results
 * and action responses. All of them are read as the request user under CPS so they fan
 * out to linked projects. The `osquery_manager` substring also matches CCS-prefixed
 * patterns (e.g. `*:logs-osquery_manager.result-*`).
 */
export const isOsqueryIndex = (index: string): boolean =>
  index.includes('osquery_manager') && !isFleetIndex(index);

export const shouldUseInternalSearchClient = (indices: string[], cpsEnabled: boolean): boolean => {
  if (!cpsEnabled) {
    return indices.some((index) => isFleetIndex(index) || index.includes('osquery_manager'));
  }

  return indices.some(isFleetIndex) || !indices.some(isOsqueryIndex);
};
