/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutLogger } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';
import type {
  BulkOperationParams,
  BulkOperationResponse,
  CreateRuleData,
  FindRulesParams,
  FindRulesResponse,
  RuleResponse,
} from '@kbn/alerting-v2-schemas';
import { COMMON_HEADERS, RULE_API_PATH } from '../../common/constants';

export interface RulesApiService {
  create: (data: CreateRuleData, options?: { id?: string }) => Promise<RuleResponse>;
  get: (id: string) => Promise<RuleResponse>;
  find: (query?: FindRulesParams) => Promise<FindRulesResponse>;
  delete: (id: string) => Promise<void>;
  bulkDelete: (params: BulkOperationParams) => Promise<BulkOperationResponse>;
  cleanUp: () => Promise<void>;
}

const stripUndefined = <T extends Record<string, unknown>>(query: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined)
  ) as Partial<T>;

export const getRulesApiService = ({
  log,
  kbnClient,
}: {
  log: ScoutLogger;
  kbnClient: KbnClient;
}): RulesApiService => {
  const bulkDelete = (params: BulkOperationParams) =>
    measurePerformanceAsync(log, 'rules.bulkDelete', async () => {
      const response = await kbnClient.request<BulkOperationResponse>({
        method: 'POST',
        path: `${RULE_API_PATH}/_bulk_delete`,
        headers: COMMON_HEADERS,
        body: params,
      });
      return response.data;
    });

  return {
    create: (data, options) =>
      measurePerformanceAsync(log, 'rules.create', async () => {
        const path = options?.id
          ? `${RULE_API_PATH}/${encodeURIComponent(options.id)}`
          : RULE_API_PATH;
        const response = await kbnClient.request<RuleResponse>({
          method: 'POST',
          path,
          headers: COMMON_HEADERS,
          body: data,
        });
        return response.data;
      }),

    get: (id) =>
      measurePerformanceAsync(log, 'rules.get', async () => {
        const response = await kbnClient.request<RuleResponse>({
          method: 'GET',
          path: `${RULE_API_PATH}/${encodeURIComponent(id)}`,
        });
        return response.data;
      }),

    find: (query = {}) =>
      measurePerformanceAsync(log, 'rules.find', async () => {
        const response = await kbnClient.request<FindRulesResponse>({
          method: 'GET',
          path: RULE_API_PATH,
          query: stripUndefined(query),
        });
        return response.data;
      }),

    delete: (id) =>
      measurePerformanceAsync(log, 'rules.delete', async () => {
        await kbnClient.request({
          method: 'DELETE',
          path: `${RULE_API_PATH}/${encodeURIComponent(id)}`,
          headers: COMMON_HEADERS,
          ignoreErrors: [404],
          retries: 0,
        });
      }),

    bulkDelete,

    cleanUp: () =>
      measurePerformanceAsync(log, 'rules.cleanUp', async () => {
        await bulkDelete({ match_all: true });
      }),
  };
};
