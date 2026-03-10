/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnifiedHistoryRow } from '../../../common/api/unified_history/types';

/**
 * Retrieves a field value from ES hit.fields (leaf values as arrays) or _source
 * (nested structure with dotted-path traversal). Returns the unwrapped scalar value.
 */
export const getField = (
  hitFields: Record<string, unknown>,
  source: Record<string, unknown>,
  name: string
): unknown => {
  const val = hitFields[name];
  if (val !== undefined) {
    return Array.isArray(val) ? val[0] : val;
  }

  // Fall back to _source — walk dotted paths (e.g. "data.query")
  const parts = name.split('.');
  let cur: unknown = source;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }

  return Array.isArray(cur) ? cur[0] : cur;
};

export interface LiveActionHit {
  _source?: Record<string, unknown>;
  fields?: Record<string, unknown>;
}

/**
 * Maps an ES hit from the live actions index to a UnifiedHistoryRow.
 */
export const mapLiveHitToRow = (hit: LiveActionHit): UnifiedHistoryRow => {
  const hitFields = (hit.fields ?? {}) as Record<string, unknown>;
  const source = (hit._source ?? {}) as Record<string, unknown>;

  const get = (name: string) => getField(hitFields, source, name);

  // agents is a genuine array of agent IDs — access it directly
  const agentsRaw = hitFields.agents ?? source.agents;
  const agentsList = Array.isArray(agentsRaw) ? agentsRaw : [];

  // Query text and agents live inside _source.queries[]
  const queries = (source.queries ?? []) as Array<{
    query?: string;
    agents?: string[];
    id?: string;
  }>;
  const isPack = queries.length > 1 || get('pack_id');
  const queryText = isPack ? '' : queries[0]?.query ?? '';

  // For packs (multiple queries), total agents from the top-level field;
  // individual query agent counts come from each sub-query's agents array
  const totalAgents =
    agentsList.length > 0
      ? agentsList.length
      : queries.reduce((sum, q) => sum + (q.agents?.length ?? 0), 0);

  // Determine source: if alert_ids is present, it's a Rule-triggered query
  const alertIdsRaw = hitFields.alert_ids ?? source.alert_ids;
  const hasAlertIds = Array.isArray(alertIdsRaw) ? alertIdsRaw.length > 0 : !!alertIdsRaw;
  const rowSource = hasAlertIds ? ('Rule' as const) : ('Live' as const);

  return {
    id: get('action_id') as string,
    rowType: 'live' as const,
    timestamp: get('@timestamp') as string,
    queryText,
    queryName: get('pack_name') as string | undefined,
    source: rowSource,
    packName: get('pack_name') as string | undefined,
    packId: get('pack_id') as string | undefined,
    agentCount: totalAgents,
    successCount: undefined,
    errorCount: undefined,
    totalRows: undefined,
    userId: get('user_id') as string | undefined,
    actionId: get('action_id') as string,
  };
};
