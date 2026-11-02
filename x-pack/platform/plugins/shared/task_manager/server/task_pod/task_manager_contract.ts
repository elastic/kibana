/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PodContractHandlers } from './pod_contract_registry';

/** Methods of Task Manager's start contract a pod may call; everything runs in Kibana. */
export const TASK_MANAGER_POD_METHODS = [
  'schedule',
  'runSoon',
  'ensureScheduled',
  'bulkUpdateSchedules',
  'bulkEnable',
  'bulkDisable',
  'bulkSchedule',
  'bulkUpdateState',
  'fetch',
  'aggregate',
  'get',
  'bulkGet',
  'remove',
  'bulkRemove',
  'removeIfExists',
  'getRegisteredTypes',
] as const;

/** UIAM (serverless) API keys are revoked by Security in Kibana: a pod has no UIAM client. */
export const TASK_MANAGER_UIAM_INVALIDATE = 'uiamInvalidateApiKey';

export const createTaskManagerPodHandlers = (
  getContract: () => Record<string, (...args: unknown[]) => unknown>,
  getUiamInvalidate: () =>
    | ((request: never, params: { id: string }) => Promise<unknown>)
    | undefined
): PodContractHandlers => ({
  ...Object.fromEntries(
    TASK_MANAGER_POD_METHODS.map((method) => [
      method,
      async (_ctx, ...args) => getContract()[method](...args),
    ])
  ),
  [TASK_MANAGER_UIAM_INVALIDATE]: async (_ctx, request, params) => {
    const invalidate = getUiamInvalidate();
    // Null mirrors Security when UIAM is not configured: callers treat it as "keys disabled".
    return invalidate ? invalidate(request as never, params as { id: string }) : null;
  },
});
