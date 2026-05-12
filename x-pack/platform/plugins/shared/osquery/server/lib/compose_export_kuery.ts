/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeKuery } from '@kbn/es-query';

/**
 * Composes the full KQL filter string used by both the route-level validator
 * and the factory DSL. Outer parentheses prevent caller-supplied `kuery` from
 * escaping the `baseFilter` gate via OR precedence.
 */
export function composeExportKuery({
  baseFilter,
  kuery,
  agentIds,
}: {
  baseFilter: string;
  kuery?: string;
  agentIds?: string[];
}): string {
  const filterParts: string[] = [`(${baseFilter})`];

  if (agentIds && agentIds.length > 0) {
    const agentFilter = agentIds.map((id) => `agent.id: "${escapeKuery(id)}"`).join(' OR ');
    filterParts.push(`(${agentFilter})`);
  }

  if (kuery) {
    filterParts.push(`(${kuery})`);
  }

  return filterParts.length === 1 ? filterParts[0] : `(${filterParts.join(' AND ')})`;
}
