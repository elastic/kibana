/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LiveHistoryRow } from '../../../common/api/unified_history/types';

export const getField = (
  hitFields: Record<string, unknown>,
  source: Record<string, unknown>,
  name: string
): unknown => {
  const val = hitFields[name];
  if (val !== undefined) {
    return Array.isArray(val) ? val[0] : val;
  }

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
  sort?: Array<string | number>;
}

export const mapLiveHitToRow = (hit: LiveActionHit): LiveHistoryRow => {
  const hitFields = (hit.fields ?? {}) as Record<string, unknown>;
  const source = (hit._source ?? {}) as Record<string, unknown>;

  const get = (name: string) => getField(hitFields, source, name);

  const agentsRaw = hitFields.agents ?? source.agents;
  const agentsList = Array.isArray(agentsRaw) ? agentsRaw : [];

  const actionId = (get('action_id') as string | undefined) ?? '';
  const packName = get('pack_name') as string | undefined;
  const packId = get('pack_id') as string | undefined;

  const queries = (source.queries ?? []) as Array<{
    query?: string;
    agents?: string[];
    id?: string;
  }>;
  const isPack = queries.length > 1 || packId;
  const queryText = isPack ? '' : queries[0]?.query ?? '';

  const totalAgents =
    agentsList.length > 0
      ? agentsList.length
      : queries.reduce((sum, q) => sum + (q.agents?.length ?? 0), 0);

  const alertIdsRaw = hitFields.alert_ids ?? source.alert_ids;
  const hasAlertIds = Array.isArray(alertIdsRaw) ? alertIdsRaw.length > 0 : !!alertIdsRaw;

  return {
    id: actionId,
    sourceType: 'live' as const,
    timestamp: get('@timestamp') as string,
    queryText,
    queryName: packName,
    source: hasAlertIds ? ('Rule' as const) : ('Live' as const),
    packName,
    packId,
    spaceId: get('space_id') as string | undefined,
    agentCount: totalAgents,
    successCount: undefined,
    errorCount: undefined,
    totalRows: undefined,
    userId: get('user_id') as string | undefined,
    actionId,
  };
};
