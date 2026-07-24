/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { evaluate as evalsBase } from '@kbn/evals';
import { withPhoenixExecutor } from '@kbn/evals-phoenix-executor';
import { RuleManagementChatClient } from './chat_client';
import { createEvaluateDataset } from './evaluate_dataset';
import type { EvaluateDataset } from './types';
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
     */
    hostMetricsIndex: string;
    /**
     * Resolves to the seeded admin-console index pattern
     */
    adminConsoleIndex: string;
    /** Creates a test `.email` connector */
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
    ({ chatClient, evaluators, executorClient, log }, use, testInfo) => {
      use(
        createEvaluateDataset({
          chatClient,
          evaluators,
          executorClient,
          log,
          testTitle: testInfo.title,
        })
      );
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
