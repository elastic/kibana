/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { HttpHandler } from '@kbn/core/public';
import type { KbnClient } from '@kbn/kbn-client';
import { evaluate as evalsBase, createAgentBuilderClient } from '@kbn/evals';
import { withPhoenixExecutor } from '@kbn/evals-phoenix-executor';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { createEvaluateDataset } from './evaluate_dataset';
import type { EvaluateDataset } from './types';
import {
  ADMIN_CONSOLE_INDEX,
  HOST_METRICS_INDEX,
  installFullStackDataForge,
  removeFullStackDataForge,
} from './full_stack_data';

const base = withPhoenixExecutor(evalsBase);

/**
 * Kibana feature config granting Alerting V2 read-only (no write) plus
 * Agent Builder access so the user can converse but not compose/modify.
 */
const RULES_READ_ONLY_ROLE = {
  elasticsearch: {
    cluster: ['monitor'],
    indices: [{ names: ['*'], privileges: ['read', 'view_index_metadata'] }],
  },
  kibana: [
    {
      base: [],
      feature: {
        alerting_v2_rules: ['read'],
        alerting_v2_action_policies: ['read'],
        agentBuilder: ['all'],
      },
      spaces: ['*'],
    },
  ],
};

/**
 * Creates a minimal {@link HttpHandler} backed by a {@link KbnClient} with
 * an API key injected as the `Authorization` header. This mirrors the
 * pattern used by `httpHandlerFromKbnClient` in `@kbn/evals`, but is kept
 * self-contained so the eval suite does not depend on unexported internals.
 */
const httpHandlerWithApiKey = (kbnClient: KbnClient, encodedApiKey: string): HttpHandler => {
  const fetch: HttpHandler = async (...args: unknown[]) => {
    const options: { path: string; method?: string; body?: unknown; query?: unknown } =
      typeof args[0] === 'string' ? { path: args[0], ...(args[1] as object) } : (args[0] as any);

    const { method = 'GET', body, query } = options;
    const response = await kbnClient.request({
      path: options.path,
      method: method as any,
      body: body && typeof body === 'string' ? JSON.parse(body) : null,
      query: query as Record<string, unknown>,
      headers: { Authorization: `ApiKey ${encodedApiKey}` },
      retries: 0,
    });
    return response.data as any;
  };
  return fetch;
};

export const evaluate = base.extend<{
  evaluateDataset: EvaluateDataset;
  /**
   * An {@link EvaluateDataset} function backed by a read-only user that has
   * `alerting_v2_rules: ['read']` but **not** `['all']`. Use in privilege-
   * enforcement specs to assert that `manage_rule` / `manage_action_policy`
   * tools refuse composition for unprivileged users.
   */
  unprivilegedEvaluateDataset: EvaluateDataset;
  /**
   * Seeds all data-forge eval data (see `full_stack_data.ts`) before the test
   * and cleans it up afterwards. Only tests that (transitively) destructure
   * this fixture pay the seeding cost, so routing-only specs stay fast.
   * Shared by {@link hostMetricsIndex} and {@link adminConsoleIndex} so the
   * data is seeded at most once per test.
   */
  fullStackData: void;
  /**
   * Resolves to the seeded host-metrics index pattern
   */
  hostMetricsIndex: string;
  /**
   * Resolves to the seeded admin-console index pattern
   */
  adminConsoleIndex: string;
  /** Creates a test `.email` connector */
  emailConnectorId: string;
}>({
  evaluateDataset: [
    ({ agentBuilderClient, evaluators, executorClient, log }, use, testInfo) => {
      use(
        createEvaluateDataset({
          agentBuilderClient,
          agentId: agentBuilderDefaultAgentId,
          evaluators,
          executorClient,
          log,
          testTitle: testInfo.title,
        })
      );
    },
    { scope: 'test' },
  ],
  unprivilegedEvaluateDataset: [
    async ({ kbnClient, connector, evaluators, executorClient, log }, use, testInfo) => {
      const roleName = `eval-read-only-${uuidv4().slice(0, 8)}`;

      await kbnClient.request({
        method: 'PUT',
        path: `/api/security/role/${roleName}`,
        body: RULES_READ_ONLY_ROLE,
      });

      const { data: apiKeyData } = await kbnClient.request<{ id: string; encoded: string }>({
        method: 'POST',
        path: '/internal/security/api_key',
        body: {
          name: `eval-${roleName}`,
          role_descriptors: {
            [roleName]: RULES_READ_ONLY_ROLE.elasticsearch,
          },
          kibana_role_descriptors: {
            [roleName]: { kibana: RULES_READ_ONLY_ROLE.kibana },
          },
        },
      });

      log.info(`Created eval read-only role "${roleName}" and API key "${apiKeyData.id}"`);

      const limitedFetch = httpHandlerWithApiKey(kbnClient, apiKeyData.encoded);
      const limitedClient = createAgentBuilderClient({
        fetch: limitedFetch,
        log,
        connectorId: connector.id,
      });

      try {
        await use(
          createEvaluateDataset({
            agentBuilderClient: limitedClient,
            agentId: agentBuilderDefaultAgentId,
            evaluators,
            executorClient,
            log,
            testTitle: testInfo.title,
          })
        );
      } finally {
        try {
          await kbnClient.request({
            method: 'POST',
            path: '/internal/security/api_key/invalidate',
            body: { ids: [apiKeyData.id], isAdmin: true },
          });
        } catch {
          // Best-effort cleanup
        }
        try {
          await kbnClient.request({
            method: 'DELETE',
            path: `/api/security/role/${roleName}`,
          });
        } catch {
          // Best-effort cleanup
        }
        log.info(`Cleaned up eval read-only role "${roleName}"`);
      }
    },
    { scope: 'test' },
  ],
  fullStackData: [
    async ({ esClient, log }, use) => {
      await installFullStackDataForge(esClient, log);
      try {
        await use();
      } finally {
        await removeFullStackDataForge(esClient, log);
      }
    },
    { scope: 'test' },
  ],
  hostMetricsIndex: [
    async ({ fullStackData }, use) => {
      await use(HOST_METRICS_INDEX);
    },
    { scope: 'test' },
  ],
  adminConsoleIndex: [
    async ({ fullStackData }, use) => {
      await use(ADMIN_CONSOLE_INDEX);
    },
    { scope: 'test' },
  ],
  emailConnectorId: [
    async ({ kbnClient, log }, use) => {
      const connectorName = `email-connector-eval-${uuidv4()}`;
      const { data } = await kbnClient.request<{ id: string }>({
        method: 'POST',
        path: '/api/actions/connector',
        body: {
          name: connectorName,
          connector_type_id: '.email',
          config: {
            from: 'alerts@example.com',
            service: '__json',
          },
          secrets: {
            user: 'test',
            password: '123456',
          },
        },
      });
      log.info(`Created eval email connector ${data.id} (${connectorName})`);
      try {
        await use(data.id);
      } finally {
        await kbnClient.request({
          method: 'DELETE',
          path: `/api/actions/connector/${data.id}`,
        });
        log.info(`Deleted eval email connector ${data.id}`);
      }
    },
    { scope: 'test' },
  ],
});
