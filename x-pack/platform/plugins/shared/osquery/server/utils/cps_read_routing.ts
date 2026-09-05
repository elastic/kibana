/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AGENT_ACTIONS_INDEX,
  AGENT_ACTIONS_RESULTS_INDEX,
  AGENTS_INDEX,
} from '@kbn/fleet-plugin/common';

const FLEET_INDEX_PREFIXES = [
  AGENTS_INDEX,
  AGENT_ACTIONS_INDEX,
  AGENT_ACTIONS_RESULTS_INDEX,
] as const;

const stripCcsPrefix = (index: string): string => {
  const colonIndex = index.indexOf(':');

  return colonIndex === -1 ? index : index.slice(colonIndex + 1);
};

/**
 * Fleet-owned indices (`.fleet-actions*`, `.fleet-actions-results*`, `.fleet-agents*`)
 * are excluded from CPS routing and the request user holds no privileges on them, so
 * reads must stay on the internal client (origin-only).
 */
const isFleetIndex = (index: string): boolean => {
  const indexName = stripCcsPrefix(index);

  return FLEET_INDEX_PREFIXES.some((prefix) => indexName.startsWith(prefix));
};

/**
 * Osquery-owned indices: action metadata (`.logs-osquery_manager.actions-*`), results
 * and action responses. All of them are read as the request user under CPS so they fan
 * out to linked projects. The `osquery_manager` substring also matches CCS-prefixed
 * patterns (e.g. `*:logs-osquery_manager.result-*`).
 */
const isOsqueryIndex = (index: string): boolean =>
  index.includes('osquery_manager') && !isFleetIndex(index);

export const shouldUseInternalSearchClient = (indices: string[], cpsActive: boolean): boolean => {
  if (!cpsActive) {
    return indices.some((index) => isFleetIndex(index) || isOsqueryIndex(index));
  }

  return indices.some(isFleetIndex) || !indices.some(isOsqueryIndex);
};
