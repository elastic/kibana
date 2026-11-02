/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { callKibana, definePodPlugin, podContract } from '@kbn/task-manager-plugin/server/task_pod';
import type { PodContractHandlers } from '@kbn/task-manager-plugin/server';
import { POD_CONTRACT_PREFIX } from '.';

const EXTENSIONS = `${POD_CONTRACT_PREFIX}.workflowsExtensions`;
const MANAGEMENT = `${POD_CONTRACT_PREFIX}.workflowsManagement`;

/** `PluginStart('workflowsExtensions')` in a pod: emitting a trigger event runs in Kibana. */
export const workflowsExtensionsPodPlugin = definePodPlugin({
  id: 'workflowsExtensions',
  start: () =>
    podContract('workflowsExtensions', {
      getClient: async (request: unknown) => {
        const { isWorkflowsAvailable } = await callKibana<{ isWorkflowsAvailable: boolean }>(
          EXTENSIONS,
          'getClientInfo',
          [request]
        );
        return {
          isWorkflowsAvailable,
          emitEvent: (triggerId: string, payload: unknown) =>
            callKibana(EXTENSIONS, 'emitEvent', [request, triggerId, payload]),
        };
      },
    }),
});

export const createWorkflowsExtensionsHandlers = (
  getService: () => {
    getClient: (request: never) => Promise<{
      isWorkflowsAvailable: boolean;
      emitEvent: (triggerId: string, payload: never) => Promise<void>;
    }>;
  }
): PodContractHandlers => ({
  getClientInfo: async (_ctx, request) => {
    const client = await getService().getClient(request as never);
    return { isWorkflowsAvailable: client.isWorkflowsAvailable };
  },
  emitEvent: async (_ctx, request, triggerId, payload) => {
    const client = await getService().getClient(request as never);
    await client.emitEvent(triggerId as string, payload as never);
  },
});

interface SettledResult {
  status: 'fulfilled' | 'rejected';
  value?: unknown;
  reason?: unknown;
}

/**
 * `PluginSetup('workflowsManagement').management` in a pod: workflow lookups and scheduling run in
 * Kibana, against the request identity the pod sends with each call.
 */
export const workflowsManagementPodPlugin = definePodPlugin({
  id: 'workflowsManagement',
  setup: () => ({
    management: podContract('workflowsManagement.management', {
      getWorkflowsByIdsForRequests: async (lookups: unknown[]) => {
        const results = await callKibana<SettledResult[]>(
          MANAGEMENT,
          'getWorkflowsByIdsForRequests',
          [lookups]
        );
        // Errors do not survive JSON; the handler sends them as `{ message }`.
        return results.map((result) =>
          result.status === 'rejected'
            ? {
                status: 'rejected',
                reason: new Error((result.reason as { message?: string })?.message ?? 'rejected'),
              }
            : result
        );
      },
      getClient: (request: unknown) =>
        podContract('workflowsManagement.client', {
          bulkScheduleWorkflow: (items: unknown[]) =>
            callKibana(MANAGEMENT, 'bulkScheduleWorkflow', [request, items]),
        }),
    }),
  }),
});

export const createWorkflowsManagementHandlers = (
  getService: () => {
    getWorkflowsByIdsForRequests: (lookups: never) => Promise<SettledResult[]>;
    getClient: (request: never) => { bulkScheduleWorkflow: (items: never) => Promise<unknown> };
  }
): PodContractHandlers => ({
  getWorkflowsByIdsForRequests: async (_ctx, lookups) => {
    const results = await getService().getWorkflowsByIdsForRequests(lookups as never);
    return results.map((result) =>
      result.status === 'rejected'
        ? {
            status: 'rejected',
            reason: { message: (result.reason as Error)?.message ?? String(result.reason) },
          }
        : result
    );
  },
  bulkScheduleWorkflow: async (_ctx, request, items) =>
    getService()
      .getClient(request as never)
      .bulkScheduleWorkflow(items as never),
});
