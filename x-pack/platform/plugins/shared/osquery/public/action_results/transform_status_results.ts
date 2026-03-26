/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DataTableRecord, EsHitRecord } from '@kbn/discover-utils';
import type { ResultEdges } from '../../common/search_strategy';
import { getAgentIdFromFields } from '../../common/utils/agent_fields';

interface TransformStatusEdgesOptions {
  edges: ResultEdges;
  agentNameMap: Map<string, string>;
  expired: boolean;
  error?: string;
}

export function computeStatus(edge: ResultEdges[number], expired: boolean, error?: string): string {
  if (edge.fields?.['error.skipped'] || (error && !edge.fields?.completed_at)) {
    return i18n.translate('xpack.osquery.liveQueryActionResults.table.skippedStatusText', {
      defaultMessage: 'skipped',
    });
  }

  if (!edge.fields?.completed_at) {
    return expired
      ? i18n.translate('xpack.osquery.liveQueryActionResults.table.expiredStatusText', {
          defaultMessage: 'expired',
        })
      : i18n.translate('xpack.osquery.liveQueryActionResults.table.pendingStatusText', {
          defaultMessage: 'pending',
        });
  }

  if (edge.fields?.['error.keyword']) {
    return i18n.translate('xpack.osquery.liveQueryActionResults.table.errorStatusText', {
      defaultMessage: 'error',
    });
  }

  return i18n.translate('xpack.osquery.liveQueryActionResults.table.successStatusText', {
    defaultMessage: 'success',
  });
}

export function transformStatusEdgesToRecords({
  edges,
  agentNameMap,
  expired,
  error,
}: TransformStatusEdgesOptions): DataTableRecord[] {
  return edges.map((edge, index) => {
    const agentId = getAgentIdFromFields(edge.fields) ?? '';
    const agentName = agentNameMap.get(agentId) || agentId;
    const status = computeStatus(edge, expired, error);

    const source = (edge._source ?? {}) as Record<string, unknown>;
    const actionResponse = source.action_response as { osquery?: { count?: number } } | undefined;
    const rowCount = actionResponse?.osquery?.count;

    const errorValue = edge.fields?.error?.[0] as string | undefined;

    const flattened: Record<string, unknown> = {
      status,
      agent_id: agentName,
      'action_response.osquery.count': rowCount ?? '-',
      error: errorValue ?? '',
      _raw_agent_id: agentId,
    };

    return {
      id: edge._id ?? `status-result-${index}`,
      raw: edge as EsHitRecord,
      flattened,
    };
  });
}
