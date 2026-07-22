/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as evalsBase } from '@kbn/evals';
import { withPhoenixExecutor } from '@kbn/evals-phoenix-executor';
import { RuleManagementChatClient } from './chat_client';
import {
  ADMIN_CONSOLE_INDEX,
  installAdminConsoleDataForge,
  removeAdminConsoleDataForge,
} from './admin_console_data';
import {
  HOST_METRICS_INDEX,
  installHostMetricsDataForge,
  removeHostMetricsDataForge,
} from './host_metrics_data';

const base = withPhoenixExecutor(evalsBase);

export const evaluate = base.extend<
  {
    /**
     * Seeds the `fake_hosts` data-forge dataset (index {@link HOST_METRICS_INDEX})
     * before the test and cleans it up afterwards, resolving to the seeded index
     * pattern. Only tests that destructure this fixture pay the seeding cost, so
     * routing-only specs stay fast. Use it for compose specs whose ES|QL must
     * validate against a real metrics index.
     */
    hostMetricsIndex: string;
    /**
     * Seeds the `fake_stack` data-forge dataset (admin-console namespace at
     * {@link ADMIN_CONSOLE_INDEX}) before the test and cleans it up afterwards.
     * Use for compose specs where the user refers to "admin console" data by
     * name and the agent must discover the concrete index / error fields.
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
    async ({ fetch, log, connector }, use) => {
      const chatClient = new RuleManagementChatClient(fetch, log, connector.id);
      await use(chatClient);
    },
    {
      scope: 'worker',
    },
  ],
  hostMetricsIndex: [
    async ({ esClient, log }, use) => {
      await installHostMetricsDataForge(esClient, log);
      try {
        await use(HOST_METRICS_INDEX);
      } finally {
        await removeHostMetricsDataForge(esClient, log);
      }
    },
    { scope: 'test' },
  ],
  adminConsoleIndex: [
    async ({ esClient, log }, use) => {
      await installAdminConsoleDataForge(esClient, log);
      try {
        await use(ADMIN_CONSOLE_INDEX);
      } finally {
        await removeAdminConsoleDataForge(esClient, log);
      }
    },
    { scope: 'test' },
  ],
  emailConnectorId: [
    async ({ kbnClient, log }, use) => {
      // Mirrors the obs-ai-assistant connector eval: the `__json` email service
      // is a no-op test transport, so nothing is actually sent.
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
