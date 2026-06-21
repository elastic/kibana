/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PUBLIC_API_HEADERS = {
  'kbn-xsrf': 'scout',
} as const;

export const INTERNAL_API_HEADERS = {
  ...PUBLIC_API_HEADERS,
  'x-elastic-internal-origin': 'scout',
} as const;

export const RULE_CREATE_PATH = 'api/alerting/rule';
export const BACKFILL_SCHEDULE_PATH = 'internal/alerting/rules/backfill/_schedule';
export const BACKFILL_FIND_PATH = 'internal/alerting/rules/backfill/_find';
export const BACKFILL_PUBLIC_SCHEDULE_PATH = 'api/alerting/rules/backfill/_schedule';
export const BACKFILL_PUBLIC_FIND_PATH = 'api/alerting/rules/backfill/_find';

export const ALERTING_CASES_SAVED_OBJECT_INDEX = '.kibana_alerting_cases_1';
export const TASK_MANAGER_INDEX = '.kibana_task_manager';
