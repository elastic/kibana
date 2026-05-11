/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutLogger } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';
import type {
  ActionPolicyResponse,
  BulkActionActionPoliciesResponse,
  CreateActionPolicyData,
  FindActionPoliciesResponse,
  UpdateActionPolicyData,
} from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_ACTION_POLICY_API_PATH } from '@kbn/alerting-v2-constants';
import { COMMON_HEADERS } from '../constants';

export interface ActionPoliciesApiService {
  create: (
    data: CreateActionPolicyData,
    options?: { id?: string }
  ) => Promise<ActionPolicyResponse>;
  get: (id: string) => Promise<ActionPolicyResponse>;
  list: (query?: Record<string, string | number | boolean>) => Promise<FindActionPoliciesResponse>;
  update: (params: {
    id: string;
    version: string;
    data: UpdateActionPolicyData;
  }) => Promise<ActionPolicyResponse>;
  enable: (id: string) => Promise<ActionPolicyResponse>;
  disable: (id: string) => Promise<ActionPolicyResponse>;
  delete: (id: string) => Promise<void>;
  /** Convenience: GET → merge → PUT to update partial attributes without manually fetching the version. */
  patch: (id: string, data: UpdateActionPolicyData) => Promise<ActionPolicyResponse>;
  cleanUp: () => Promise<void>;
}

export const getActionPoliciesApiService = ({
  log,
  kbnClient,
}: {
  log: ScoutLogger;
  kbnClient: KbnClient;
}): ActionPoliciesApiService => {
  const get: ActionPoliciesApiService['get'] = (id) =>
    measurePerformanceAsync(log, 'actionPolicies.get', async () => {
      const response = await kbnClient.request<ActionPolicyResponse>({
        method: 'GET',
        path: `${ALERTING_V2_ACTION_POLICY_API_PATH}/${encodeURIComponent(id)}`,
      });
      return response.data;
    });

  const list: ActionPoliciesApiService['list'] = (query = {}) =>
    measurePerformanceAsync(log, 'actionPolicies.list', async () => {
      const response = await kbnClient.request<FindActionPoliciesResponse>({
        method: 'GET',
        path: ALERTING_V2_ACTION_POLICY_API_PATH,
        query,
      });
      return response.data;
    });

  const update: ActionPoliciesApiService['update'] = ({ id, version, data }) =>
    measurePerformanceAsync(log, 'actionPolicies.update', async () => {
      const response = await kbnClient.request<ActionPolicyResponse>({
        method: 'PUT',
        path: `${ALERTING_V2_ACTION_POLICY_API_PATH}/${encodeURIComponent(id)}`,
        headers: COMMON_HEADERS,
        body: { ...data, version },
      });
      return response.data;
    });

  const patch: ActionPoliciesApiService['patch'] = (id, data) =>
    measurePerformanceAsync(log, 'actionPolicies.patch', async () => {
      const current = await get(id);
      if (!current.version) {
        throw new Error(`Action policy "${id}" has no version; cannot patch.`);
      }
      return update({ id, version: current.version, data });
    });

  return {
    create: (data, options) =>
      measurePerformanceAsync(log, 'actionPolicies.create', async () => {
        const path = options?.id
          ? `${ALERTING_V2_ACTION_POLICY_API_PATH}/${encodeURIComponent(options.id)}`
          : ALERTING_V2_ACTION_POLICY_API_PATH;
        const response = await kbnClient.request<ActionPolicyResponse>({
          method: 'POST',
          path,
          headers: COMMON_HEADERS,
          body: data,
        });
        return response.data;
      }),

    get,
    list,
    update,
    patch,

    enable: (id) =>
      measurePerformanceAsync(log, 'actionPolicies.enable', async () => {
        const response = await kbnClient.request<ActionPolicyResponse>({
          method: 'POST',
          path: `${ALERTING_V2_ACTION_POLICY_API_PATH}/${encodeURIComponent(id)}/_enable`,
          headers: COMMON_HEADERS,
        });
        return response.data;
      }),

    disable: (id) =>
      measurePerformanceAsync(log, 'actionPolicies.disable', async () => {
        const response = await kbnClient.request<ActionPolicyResponse>({
          method: 'POST',
          path: `${ALERTING_V2_ACTION_POLICY_API_PATH}/${encodeURIComponent(id)}/_disable`,
          headers: COMMON_HEADERS,
        });
        return response.data;
      }),

    delete: (id) =>
      measurePerformanceAsync(log, 'actionPolicies.delete', async () => {
        await kbnClient.request({
          method: 'DELETE',
          path: `${ALERTING_V2_ACTION_POLICY_API_PATH}/${encodeURIComponent(id)}`,
          headers: COMMON_HEADERS,
          ignoreErrors: [404],
          retries: 0,
        });
      }),

    cleanUp: () =>
      measurePerformanceAsync(log, 'actionPolicies.cleanUp', async () => {
        const { items } = await list({ perPage: 100 });
        if (items.length === 0) return;

        await kbnClient.request<BulkActionActionPoliciesResponse>({
          method: 'POST',
          path: `${ALERTING_V2_ACTION_POLICY_API_PATH}/_bulk`,
          headers: COMMON_HEADERS,
          body: {
            actions: items.map((item) => ({ id: item.id, action: 'delete' as const })),
          },
        });
      }),
  };
};
