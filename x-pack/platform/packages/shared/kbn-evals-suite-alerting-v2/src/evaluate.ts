/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { evaluate as evalsBase } from '@kbn/evals';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import type { CreateRuleData, RuleResponse } from '@kbn/alerting-v2-schemas';
import {
  ALERTING_V2_ACTION_POLICY_API_PATH,
  ALERTING_V2_RULE_API_PATH,
} from '@kbn/alerting-v2-constants';
import {
  installHostMetricsDataStream,
  removeHostMetricsDataStream,
  type HostMetricsDataStream,
} from './data_stream_data';
import { createEvaluateDataset } from './evaluate_dataset';
import type { EvaluateDataset } from './types';
import {
  ADMIN_CONSOLE_INDEX,
  HOST_METRICS_INDEX,
  installFullStackDataForge,
  removeFullStackDataForge,
} from './full_stack_data';

const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json',
};

/** A saved entity seeded before the test, so the agent has something to discover and edit. */
export interface SeededEntity {
  id: string;
  name: string;
}

export const evaluate = evalsBase.extend<{
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
  /**
   * Seeds a real host-metrics data stream and resolves its name and current
   * backing index. Opt-in: only the concrete-index evals pay for it.
   */
  hostMetricsDataStream: HostMetricsDataStream;
  /** Creates a test `.email` connector */
  emailConnectorId: string;
  /** Saves a rule with a unique name before the test and deletes it afterwards. */
  existingRule: SeededEntity;
  /** Saves an action policy with a unique name before the test and deletes it afterwards. */
  existingActionPolicy: SeededEntity;
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
  hostMetricsDataStream: [
    async ({ esClient, log }, use) => {
      try {
        await use(await installHostMetricsDataStream(esClient, log));
      } finally {
        await removeHostMetricsDataStream(esClient, log);
      }
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
  existingRule: [
    async ({ kbnClient, log }, use) => {
      const name = `Eval existing rule ${uuidv4().slice(0, 8)}`;
      const ruleData: CreateRuleData = {
        kind: 'alert',
        metadata: { name },
        schedule: { every: '5m', lookback: '5m' },
        recovery: { strategy: 'no_breach' },
        no_data: { strategy: 'ignore' },
        query: {
          base: 'FROM logs-* | STATS error_count = COUNT(*) BY host.name | WHERE error_count > 100',
        },
        time_field: '@timestamp',
        grouping: { fields: ['host.name'] },
        state_transition: { pending: { count: 0 }, recovering: { count: 0 } },
      };
      const { data } = await kbnClient.request<RuleResponse>({
        method: 'POST',
        path: ALERTING_V2_RULE_API_PATH,
        headers: COMMON_HEADERS,
        body: ruleData,
      });
      log.info(`Created eval rule ${data.id} (${name})`);
      try {
        await use({ id: data.id, name });
      } finally {
        await kbnClient.request({
          method: 'DELETE',
          path: `${ALERTING_V2_RULE_API_PATH}/${encodeURIComponent(data.id)}`,
          headers: COMMON_HEADERS,
          ignoreErrors: [404],
        });
        log.info(`Deleted eval rule ${data.id}`);
      }
    },
    { scope: 'test' },
  ],
  existingActionPolicy: [
    async ({ kbnClient, log }, use) => {
      const name = `Eval existing policy ${uuidv4().slice(0, 8)}`;
      const { data } = await kbnClient.request<{ id: string }>({
        method: 'POST',
        path: ALERTING_V2_ACTION_POLICY_API_PATH,
        headers: COMMON_HEADERS,
        body: {
          name,
          description: 'Seeded by the alerting-v2 evals',
          destinations: [{ type: 'workflow', id: 'eval-workflow-id' }],
        },
      });
      log.info(`Created eval action policy ${data.id} (${name})`);
      try {
        await use({ id: data.id, name });
      } finally {
        await kbnClient.request({
          method: 'DELETE',
          path: `${ALERTING_V2_ACTION_POLICY_API_PATH}/${encodeURIComponent(data.id)}`,
          headers: COMMON_HEADERS,
          ignoreErrors: [404],
        });
        log.info(`Deleted eval action policy ${data.id}`);
      }
    },
    { scope: 'test' },
  ],
});
