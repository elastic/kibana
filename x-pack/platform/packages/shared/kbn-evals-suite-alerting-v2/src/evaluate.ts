/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as evalsBase } from '@kbn/evals';
import { withPhoenixExecutor } from '@kbn/evals-phoenix-executor';
import { RuleManagementChatClient } from './chat_client';
import { createEvaluateDataset, type EvaluateDataset } from './evaluate_dataset';
import {
  ADMIN_CONSOLE_INDEX,
  HOST_METRICS_INDEX,
  installFullStackDataForge,
  removeFullStackDataForge,
} from './full_stack_data';

const base = withPhoenixExecutor(evalsBase);

export const evaluate = base.extend<
  {
    evaluateDataset: EvaluateDataset;
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
     * ({@link HOST_METRICS_INDEX}), seeding via {@link fullStackData}. Use it
     * for compose specs whose ES|QL must validate against a real metrics index.
     */
    hostMetricsIndex: string;
    /**
     * Resolves to the seeded admin-console index pattern
     * ({@link ADMIN_CONSOLE_INDEX}), seeding via {@link fullStackData}. Use for
     * compose specs where the user refers to "admin console" data by name and
     * the agent must discover the concrete index / error fields.
     */
    adminConsoleIndex: string;
    /**
     * Creates a test `.email` connector (the `__json` service delivers nothing)
     * before the test and deletes it afterwards, resolving to the connector id.
     * The rule-management skill's default notification setup (Part 3) looks up
     * an email connector via `platform.workflows.get_connectors`; without one
     * the agent is instructed to stop and point the user at Stack Management,
     * so notification-flow specs must seed a connector.
     */
    emailConnectorId: string;
  },
  {
    chatClient: RuleManagementChatClient;
  }
>({
  chatClient: [
    async ({ fetch, kbnClient, log, connector }, use) => {
      const chatClient = new RuleManagementChatClient(fetch, kbnClient, log, connector.id);
      await use(chatClient);
    },
    {
      scope: 'worker',
    },
  ],
  evaluateDataset: [
    ({ chatClient, evaluators, executorClient, log }, use) => {
      use(createEvaluateDataset({ chatClient, evaluators, executorClient, log }));
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
      const { data } = await kbnClient.request<{ id: string }>({
        method: 'POST',
        path: '/api/actions/connector',
        body: {
          name: 'email-connector-eval',
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
      log.info(`Created eval email connector ${data.id}`);
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
