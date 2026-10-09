/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { randomUUID } from 'crypto';

import { MOCK_IDP_GATEWAY_SHARED_SECRET } from '@kbn/mock-idp-utils';
import type { ApiClientFixture, KbnClient } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { ES_CLIENT_AUTHENTICATION_HEADER } from '../../../../common/constants';
import { apiTest, HEADERS, ORG_ADMIN_HEADERS, serviceAccountPath } from '../fixtures';
import { workloadPath } from '../fixtures/service_account_workloads';
import {
  createSystemIndicesEsClient,
  SYSTEM_INDICES_HEADERS,
} from '../fixtures/system_indices_es_client';
import { exchangeUiamServiceAccountToken } from '../fixtures/uiam_service_account_token';

const TASKS_PATH = 'internal/service_accounts_test/_tasks';
// How long to wait for a rule run, and for Task Manager's index to show a new task.
const RULE_RUN_TIMEOUT_MS = 120_000;
const STORED_TASK_TIMEOUT_MS = 10_000;
// A rule test waits for up to two runs.
const RULE_TEST_TIMEOUT_MS = 300_000;
const uniqueName = () => `sa-uiam-workloads-${randomUUID()}`;

interface RuleResponse {
  id: string;
  api_key_owner: string | null;
}

interface ExecutionLog {
  data: Array<{ status: string }>;
}

/** The credentials a workload's saved object holds. Both values are encrypted at rest. */
interface StoredCredentials {
  apiKey?: string | null;
  uiamApiKey?: string | null;
}

// The local UIAM client certificate identifies an Elasticsearch (Search) project.
apiTest.describe(
  'Workloads created by a UIAM service account',
  { tag: ['@local-serverless-search'] },
  () => {
    const ruleIds: string[] = [];
    const taskIds: string[] = [];
    const workloadIds: string[] = [];
    const indexName = uniqueName();
    let systemEsClient: Client;

    const ruleBody = (name: string) => ({
      name,
      rule_type_id: '.es-query',
      consumer: 'stackAlerts',
      schedule: { interval: '1d' },
      actions: [],
      params: {
        index: [indexName],
        timeField: '@timestamp',
        esQuery: '{\n  "query":{\n    "match_all" : {}\n  }\n}',
        size: 100,
        timeWindowSize: 1,
        timeWindowUnit: 'd',
        thresholdComparator: '>',
        threshold: [0],
        searchType: 'esQuery',
        excludeHitsFromPreviousRun: false,
        aggType: 'count',
        groupBy: 'all',
      },
    });

    /** Headers for calling Kibana directly as the account, the way an external client would. */
    const asAccount = (token: string) => ({
      ...HEADERS,
      Authorization: `Bearer ${token}`,
      // Elasticsearch only accepts the token alongside the secret the gateway adds in front of a
      // real project.
      [ES_CLIENT_AUTHENTICATION_HEADER]: MOCK_IDP_GATEWAY_SHARED_SECRET,
    });

    /**
     * Reads the credentials a rule or task saved object holds, straight from its index. Task
     * Manager doesn't refresh its index when it schedules a task, so this waits for the document.
     */
    const getStoredCredentials = async (
      type: 'alert' | 'task',
      id: string
    ): Promise<StoredCredentials> => {
      let stored: StoredCredentials | undefined;
      await expect
        .poll(
          async () => {
            // Task Manager's index is hidden, so the wildcard has to expand to hidden indices too.
            const { hits } = await systemEsClient.search<Record<string, StoredCredentials>>(
              {
                index: '.kibana*',
                expand_wildcards: 'all',
                query: { ids: { values: [`${type}:${id}`] } },
              },
              { headers: SYSTEM_INDICES_HEADERS }
            );
            stored = hits.hits[0]?._source?.[type];
            return hits.hits.length;
          },
          { timeout: STORED_TASK_TIMEOUT_MS, message: `No saved object for ${type} ${id}` }
        )
        .toBe(1);
      const { apiKey, uiamApiKey } = stored ?? {};
      return { apiKey, uiamApiKey };
    };

    const expectUiamKeyOnly = ({ apiKey, uiamApiKey }: StoredCredentials) => {
      expect(apiKey ?? null).toBeNull();
      expect(typeof uiamApiKey).toBe('string');
    };

    /**
     * Runs the rule now and waits for a successful run. The rule holds no Elasticsearch key, so a
     * run only succeeds when its UIAM key authenticates. It doesn't check the alert count: the
     * local serverless stack can't resolve linked projects, so the rule finds nothing whoever
     * created it.
     */
    const runRule = async (
      kbnClient: KbnClient,
      runSoon: (ruleId: string) => Promise<void>,
      ruleId: string
    ) => {
      const dateStart = new Date().toISOString();
      await runSoon(ruleId);
      await expect
        .poll(
          async () => {
            const { data } = await kbnClient.request<ExecutionLog>({
              method: 'GET',
              path: `/internal/alerting/rule/${ruleId}/_execution_log`,
              query: { date_start: dateStart, per_page: 10 },
            });
            return data.data.map(({ status }) => status);
          },
          {
            timeout: RULE_RUN_TIMEOUT_MS,
            intervals: [2_000],
            message: `Rule ${ruleId} did not run`,
          }
        )
        .toContain('success');
    };

    apiTest.beforeAll(async ({ esClient, config }) => {
      systemEsClient = await createSystemIndicesEsClient(esClient, config);
      await esClient.index({
        index: indexName,
        document: { '@timestamp': new Date().toISOString() },
        refresh: 'wait_for',
      });
    });

    /** Binds a test plugin workload to the account, as the seeded organization key. */
    const bindWorkload = async (
      apiClient: ApiClientFixture,
      workloadId: string,
      serviceAccountId: string
    ) => {
      workloadIds.push(workloadId);
      const bound = await apiClient.post(workloadPath(workloadId), {
        headers: ORG_ADMIN_HEADERS,
        body: { operation: 'bind', serviceAccountId },
        responseType: 'json',
      });
      expect(bound).toHaveStatusCode(200);
    };

    // Deleting rules and tasks through their own APIs also invalidates the API keys they hold.
    apiTest.afterAll(async ({ apiClient, apiServices, esClient }) => {
      for (const id of ruleIds) await apiServices.alerting.rules.delete(id);
      for (const id of taskIds) {
        await apiClient.delete(`${TASKS_PATH}/${id}`, { headers: ORG_ADMIN_HEADERS });
      }
      for (const workloadId of workloadIds) {
        await apiClient.post(workloadPath(workloadId), {
          headers: ORG_ADMIN_HEADERS,
          body: { operation: 'unbind' },
        });
      }
      await esClient.indices.delete({ index: indexName }, { ignore: [404] });
      await systemEsClient?.close();
    });

    apiTest(
      'a direct caller creates a rule that holds only a UIAM API key and outlives the account',
      async ({ apiClient, apiServices, kbnClient, uiamServiceAccounts }) => {
        apiTest.setTimeout(RULE_TEST_TIMEOUT_MS);
        const { id: accountId } = await uiamServiceAccounts.create({
          name: uniqueName(),
          roles: ['admin'],
        });
        const token = await exchangeUiamServiceAccountToken(accountId);

        const created = await apiClient.post('api/alerting/rule', {
          headers: asAccount(token),
          body: ruleBody(uniqueName()),
          responseType: 'json',
        });
        expect(created).toHaveStatusCode(200);
        const rule = created.body as RuleResponse;
        ruleIds.push(rule.id);
        expect(rule.api_key_owner).toBe(accountId);
        expectUiamKeyOnly(await getStoredCredentials('alert', rule.id));

        await runRule(kbnClient, apiServices.alerting.rules.runSoon, rule.id);

        // The rule keeps its own key after the account that created it is gone.
        const deleted = await apiClient.delete(`${serviceAccountPath(accountId)}?force=true`, {
          headers: ORG_ADMIN_HEADERS,
          responseType: 'json',
        });
        expect(deleted).toHaveStatusCode(200);
        await runRule(kbnClient, apiServices.alerting.rules.runSoon, rule.id);
      }
    );

    apiTest(
      'a direct caller schedules a task that holds only a UIAM API key',
      async ({ apiClient, uiamServiceAccounts }) => {
        const { id: accountId } = await uiamServiceAccounts.create({
          name: uniqueName(),
          roles: ['admin'],
        });
        const token = await exchangeUiamServiceAccountToken(accountId);

        const scheduled = await apiClient.post(TASKS_PATH, {
          headers: asAccount(token),
          responseType: 'json',
        });
        expect(scheduled).toHaveStatusCode(200);
        const { id } = scheduled.body as { id: string };
        taskIds.push(id);
        expectUiamKeyOnly(await getStoredCredentials('task', id));
      }
    );

    apiTest(
      'a workload running as the account creates a rule through the self client',
      async ({ apiClient, apiServices, kbnClient, uiamServiceAccounts }) => {
        apiTest.setTimeout(RULE_TEST_TIMEOUT_MS);
        const workloadId = uniqueName();
        const { id: accountId } = await uiamServiceAccounts.create({
          name: workloadId,
          roles: ['admin'],
        });
        await bindWorkload(apiClient, workloadId, accountId);

        const executed = await apiClient.post(workloadPath(workloadId), {
          headers: ORG_ADMIN_HEADERS,
          body: { operation: 'execute', action: 'create_rule', rule: ruleBody(workloadId) },
          responseType: 'json',
        });
        expect(executed).toHaveStatusCode(200);
        const { status, body } = executed.body as { status: number; body: RuleResponse };
        expect(status).toBe(200);
        ruleIds.push(body.id);
        expect(body.api_key_owner).toBe(accountId);
        expectUiamKeyOnly(await getStoredCredentials('alert', body.id));

        await runRule(kbnClient, apiServices.alerting.rules.runSoon, body.id);
      }
    );

    apiTest(
      'a workload running as the account schedules a task through the self client',
      async ({ apiClient, uiamServiceAccounts }) => {
        const workloadId = uniqueName();
        const { id: accountId } = await uiamServiceAccounts.create({
          name: workloadId,
          roles: ['admin'],
        });
        await bindWorkload(apiClient, workloadId, accountId);

        const executed = await apiClient.post(workloadPath(workloadId), {
          headers: ORG_ADMIN_HEADERS,
          body: { operation: 'execute', action: 'schedule_task' },
          responseType: 'json',
        });
        expect(executed).toHaveStatusCode(200);
        const { status, body } = executed.body as { status: number; body: { id: string } };
        expect(status).toBe(200);
        taskIds.push(body.id);
        expectUiamKeyOnly(await getStoredCredentials('task', body.id));
      }
    );
  }
);
