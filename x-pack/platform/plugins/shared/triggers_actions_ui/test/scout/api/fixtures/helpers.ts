/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ApiClientFixture, EsClient } from '@kbn/scout';
import {
  ALERTING_CASES_SAVED_OBJECT_INDEX,
  BACKFILL_SCHEDULE_PATH,
  INTERNAL_API_HEADERS,
  PUBLIC_API_HEADERS,
  RULE_CREATE_PATH,
  TASK_MANAGER_INDEX,
} from './constants';

export interface BackfillResponse {
  id: string;
  duration: string;
  enabled: boolean;
  start: string;
  end: string;
  status: string;
  space_id?: string;
  initiator: string;
  initiator_id?: string;
  created_at: string;
  schedule: Array<{
    interval: string;
    status: string;
    run_at: string;
  }>;
  rule: {
    id: string;
    name: string;
    rule_type_id: string;
    consumer: string;
    actions?: unknown[];
  };
  warnings?: string[];
}

export interface FindBackfillResponse {
  page: number;
  per_page: number;
  total: number;
  data: BackfillResponse[];
}

export interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string;
}

export interface TaskManagerDoc {
  type: string;
  task: {
    taskType: string;
    timeoutOverride?: string;
    enabled: boolean;
    params: string;
  };
}

export interface AdHocRunSavedObjectSource {
  ad_hoc_run_params: {
    apiKeyId?: string;
    apiKeyToUse?: string;
    createdAt: string;
    duration: string;
    enabled: boolean;
    start: string;
    end: string;
    status: string;
    spaceId?: string;
    schedule: Array<{
      interval: string;
      status: string;
      runAt: string;
    }>;
  };
  references?: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

export const daysAgoIso = (days: number, startOfDay = true): string => {
  const date = new Date();
  if (startOfDay) {
    date.setUTCHours(0, 0, 0, 0);
  }
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
};

export const addHoursIso = (isoDate: string, hours: number): string =>
  new Date(new Date(isoDate).getTime() + hours * 60 * 60 * 1000).toISOString();

export const makeBackfillRule = (namePrefix = 'scout-backfill') => ({
  name: `${namePrefix}-${Date.now()}-${uuidv4()}`,
  rule_type_id: 'siem.queryRule',
  consumer: 'siem',
  enabled: true,
  actions: [],
  schedule: { interval: '12h' },
  tags: ['backfill-test'],
  params: {
    author: [],
    description: 'Scout backfill test rule',
    falsePositives: [],
    from: 'now-86460s',
    ruleId: uuidv4(),
    immutable: false,
    license: '',
    outputIndex: '',
    meta: {},
    maxSignals: 100,
    riskScore: 21,
    riskScoreMapping: [],
    severity: 'low',
    severityMapping: [],
    threat: [],
    to: 'now',
    references: [],
    version: 1,
    exceptionsList: [],
    relatedIntegrations: [],
    requiredFields: [],
    setup: '',
    type: 'query',
    language: 'kuery',
    index: ['.kibana'],
    query: '*',
    filters: [],
  },
});

export const makeEsQueryRule = (namePrefix: string) => ({
  name: `${namePrefix}-rule-${Date.now()}-${uuidv4()}`,
  ruleTypeId: '.es-query',
  consumer: 'stackAlerts',
  params: {
    searchType: 'esQuery' as const,
    timeWindowSize: 5,
    timeWindowUnit: 'm',
    threshold: [0],
    thresholdComparator: '>',
    size: 100,
    esQuery: '{"query":{"match_all":{}}}',
    aggType: 'count',
    groupBy: 'all',
    termSize: 5,
    excludeHitsFromPreviousRun: false,
    sourceFields: [],
    index: ['.kibana'],
    timeField: 'updated_at',
  },
  schedule: { interval: '1m' },
  tags: [namePrefix],
});

export const createRule = async ({
  apiClient,
  cookieHeader,
  body,
}: {
  apiClient: ApiClientFixture;
  cookieHeader: Record<string, string>;
  body: Record<string, unknown>;
}): Promise<string> => {
  const response = await apiClient.post(RULE_CREATE_PATH, {
    headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
    body,
  });
  if (response.statusCode !== 200) {
    throw new Error(
      `Failed to create rule: ${response.statusCode} ${JSON.stringify(response.body)}`
    );
  }
  return (response.body as { id: string }).id;
};

export const deleteRule = async ({
  apiClient,
  cookieHeader,
  ruleId,
}: {
  apiClient: ApiClientFixture;
  cookieHeader: Record<string, string>;
  ruleId: string;
}): Promise<void> => {
  await apiClient.delete(`${RULE_CREATE_PATH}/${ruleId}`, {
    headers: { ...PUBLIC_API_HEADERS, ...cookieHeader },
  });
};

export const deleteBackfill = async ({
  apiClient,
  cookieHeader,
  backfillId,
}: {
  apiClient: ApiClientFixture;
  cookieHeader: Record<string, string>;
  backfillId: string;
}): Promise<void> => {
  await apiClient.delete(`internal/alerting/rules/backfill/${backfillId}`, {
    headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
  });
};

export const scheduleBackfills = async ({
  apiClient,
  cookieHeader,
  body,
}: {
  apiClient: ApiClientFixture;
  cookieHeader: Record<string, string>;
  body: Array<Record<string, unknown>>;
}): Promise<BackfillResponse[]> => {
  const response = await apiClient.post(BACKFILL_SCHEDULE_PATH, {
    headers: { ...INTERNAL_API_HEADERS, ...cookieHeader },
    body,
  });
  if (response.statusCode !== 200) {
    throw new Error(
      `Failed to schedule backfill: ${response.statusCode} ${JSON.stringify(response.body)}`
    );
  }
  return response.body as BackfillResponse[];
};

export const getScheduledTask = async (esClient: EsClient, id: string): Promise<TaskManagerDoc> => {
  const response = await esClient.get<TaskManagerDoc>({
    id: `task:${id}`,
    index: TASK_MANAGER_INDEX,
  });
  return response._source!;
};

export const getScheduledTaskStatusCode = async (
  esClient: EsClient,
  id: string
): Promise<number> => {
  try {
    await getScheduledTask(esClient, id);
    return 200;
  } catch (error) {
    return (error as { meta?: { statusCode?: number } }).meta?.statusCode ?? 500;
  }
};

export const getAdHocRunSavedObject = async (
  esClient: EsClient,
  id: string
): Promise<AdHocRunSavedObjectSource> => {
  const response = await esClient.get<AdHocRunSavedObjectSource>({
    index: ALERTING_CASES_SAVED_OBJECT_INDEX,
    id: `ad_hoc_run_params:${id}`,
  });
  return response._source!;
};
