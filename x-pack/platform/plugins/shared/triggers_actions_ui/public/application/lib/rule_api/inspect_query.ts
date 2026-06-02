/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup } from '@kbn/core/public';
import { BASE_ALERTING_API_PATH } from '../../constants';

export interface QueryInspectorResult {
  index: string;
  request: Record<string, unknown>;
  response?: Record<string, unknown>;
  label?: string;
}

export interface QueryInspectorResponse {
  queries: QueryInspectorResult[];
}

export async function loadRuleQueryInspector({
  http,
  ruleId,
  mode = 'build',
  alertId,
}: {
  http: HttpSetup;
  ruleId: string;
  mode?: 'build' | 'execute';
  alertId?: string;
}): Promise<QueryInspectorResponse> {
  return http.get<QueryInspectorResponse>(
    `${BASE_ALERTING_API_PATH}/rule/${encodeURIComponent(ruleId)}/query_inspector`,
    {
      query: {
        mode,
        ...(alertId ? { alert_id: alertId } : {}),
      },
    }
  );
}
