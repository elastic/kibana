/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, type EsClient, type KbnClient } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import {
  deleteServiceAccounts,
  type ServiceAccountPrincipal,
} from '../fixtures/service_account_cleanup';
import { bindWorkload, unbindWorkloads, workloadPath } from '../fixtures/service_account_workloads';

const HEADERS = { 'kbn-xsrf': 'true', 'x-elastic-internal-origin': 'kibana' };
// The token a test presents as the account. Kibana's own token for the account is removed by
// `deleteServiceAccounts` already, so cleanup only has to name this one.
const DIRECT_TOKEN_NAME = 'direct-caller';
const TASKS_PATH = 'internal/service_accounts_test/_tasks';
const uniqueName = () => `sa-workloads-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

interface RuleResponse {
  id: string;
  api_key_owner: string | null;
}

interface ExecutionLog {
  data: Array<{ status: string; num_active_alerts: number }>;
}

apiTest.describe(
  'Workloads created by an Elasticsearch service account',
  { tag: ['@local-stateful-classic'] },
  () => {
    const accounts: ServiceAccountPrincipal[] = [];
    const ruleIds: string[] = [];
    const taskIds: string[] = [];
    const workloadIds: string[] = [];
    const builtInTokenNames: string[] = [];
    const roleName = uniqueName();
    const indexName = uniqueName();
    // An index the account's role does not cover, to show its keys are limited to that role.
    const deniedIndexName = uniqueName();

    const ruleBody = (name: string, index = indexName) => ({
      name,
      rule_type_id: '.es-query',
      consumer: 'stackAlerts',
      schedule: { interval: '1d' },
      actions: [],
      params: {
        index: [index],
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

    /** Creates an account through Kibana and mints it a token for direct use. */
    const createAccount = async (kbnClient: KbnClient, esClient: EsClient) => {
      const name = uniqueName();
      accounts.push({ namespace: 'kibana', name });
      await kbnClient.request({
        method: 'POST',
        path: '/internal/security/service_account',
        body: { name, roles: [roleName] },
      });
      const { token } = await esClient.security.createServiceToken({
        namespace: 'kibana',
        service: name,
        name: DIRECT_TOKEN_NAME,
      });
      return { name, accountId: `kibana/${name}`, token: token.value };
    };

    /**
     * Runs the rule now and returns its first successful run. The ES query rule skips indices its
     * API key can't read instead of failing, so callers check `num_active_alerts`: each index
     * holds one document, so a run that could read it reports one active alert.
     */
    const runRule = async (
      kbnClient: KbnClient,
      runSoon: (ruleId: string) => Promise<void>,
      ruleId: string
    ) => {
      const dateStart = new Date().toISOString();
      await runSoon(ruleId);
      let runs: ExecutionLog['data'] = [];
      await expect
        .poll(
          async () => {
            const { data } = await kbnClient.request<ExecutionLog>({
              method: 'GET',
              path: `/internal/alerting/rule/${ruleId}/_execution_log`,
              query: { date_start: dateStart, per_page: 10 },
            });
            runs = data.data;
            return runs.map(({ status }) => status);
          },
          { timeout: 120_000, intervals: [2_000], message: `Rule ${ruleId} did not run` }
        )
        .toContain('success');
      return runs.find(({ status }) => status === 'success');
    };

    apiTest.beforeAll(async ({ esClient, kbnClient }) => {
      for (const index of [indexName, deniedIndexName]) {
        await esClient.index({
          index,
          document: { '@timestamp': new Date().toISOString() },
          refresh: 'wait_for',
        });
      }
      await kbnClient.request({
        method: 'PUT',
        path: `/api/security/role/${roleName}`,
        body: {
          elasticsearch: { indices: [{ names: [indexName], privileges: ['read'] }] },
          kibana: [{ base: [], feature: { stackAlerts: ['all'] }, spaces: ['*'] }],
        },
      });
    });

    // Every step treats an already-missing resource as cleaned up, so expected 404s don't skip the
    // steps after them. Deleting rules and tasks through their own APIs also invalidates the API
    // keys they hold.
    apiTest.afterAll(async ({ apiServices, esClient, kbnClient, config }) => {
      for (const id of ruleIds) await apiServices.alerting.rules.delete(id);
      for (const id of taskIds) {
        await kbnClient.request({ method: 'DELETE', path: `/${TASKS_PATH}/${id}` });
      }
      await unbindWorkloads(kbnClient, workloadIds);
      for (const name of builtInTokenNames) {
        await esClient.security.deleteServiceToken(
          { namespace: 'elastic', service: 'fleet-server', name },
          { ignore: [404] }
        );
      }
      await deleteServiceAccounts(esClient, config, accounts, { tokenNames: [DIRECT_TOKEN_NAME] });
      await kbnClient.request({
        method: 'DELETE',
        path: `/api/security/role/${roleName}`,
        ignoreErrors: [404],
      });
      await esClient.indices.delete({ index: [indexName, deniedIndexName] }, { ignore: [404] });
    });

    apiTest(
      'a direct caller creates a rule whose API key outlives the account',
      async ({ apiClient, apiServices, esClient, kbnClient, config }) => {
        const { name, accountId, token } = await createAccount(kbnClient, esClient);

        const created = await apiClient.post('api/alerting/rule', {
          headers: { ...HEADERS, authorization: `Bearer ${token}` },
          body: ruleBody(name),
          responseType: 'json',
        });
        expect(created).toHaveStatusCode(200);
        const rule = created.body as RuleResponse;
        ruleIds.push(rule.id);
        expect(rule.api_key_owner).toBe(accountId);

        expect(await runRule(kbnClient, apiServices.alerting.rules.runSoon, rule.id)).toMatchObject(
          {
            num_active_alerts: 1,
          }
        );

        // B8: the rule keeps its own key after the account that created it is gone.
        await deleteServiceAccounts(esClient, config, [{ namespace: 'kibana', name }], {
          tokenNames: [DIRECT_TOKEN_NAME],
        });
        expect(await runRule(kbnClient, apiServices.alerting.rules.runSoon, rule.id)).toMatchObject(
          {
            num_active_alerts: 1,
          }
        );
      }
    );

    apiTest(
      "a direct caller's rule can only read what the account's role can read",
      async ({ apiClient, apiServices, esClient, kbnClient }) => {
        const { name, token } = await createAccount(kbnClient, esClient);

        const created = await apiClient.post('api/alerting/rule', {
          headers: { ...HEADERS, authorization: `Bearer ${token}` },
          body: ruleBody(name, deniedIndexName),
          responseType: 'json',
        });
        expect(created).toHaveStatusCode(200);
        const rule = created.body as RuleResponse;
        ruleIds.push(rule.id);

        expect(await runRule(kbnClient, apiServices.alerting.rules.runSoon, rule.id)).toMatchObject(
          {
            num_active_alerts: 0,
          }
        );
      }
    );

    apiTest(
      'a direct caller schedules a task with an API key owned by the account',
      async ({ apiClient, esClient, kbnClient }) => {
        const { accountId, token } = await createAccount(kbnClient, esClient);

        const scheduled = await apiClient.post(TASKS_PATH, {
          headers: { ...HEADERS, authorization: `Bearer ${token}` },
          responseType: 'json',
        });
        expect(scheduled).toHaveStatusCode(200);
        const { id, apiKeyId } = scheduled.body as { id: string; apiKeyId: string };
        taskIds.push(id);
        expect(apiKeyId).toBeDefined();

        const { api_keys: apiKeys } = await esClient.security.getApiKey({ id: apiKeyId });
        expect(apiKeys).toHaveLength(1);
        expect(apiKeys[0]).toMatchObject({ username: accountId, realm: '_service_account' });
      }
    );

    apiTest(
      'a workload running as the account creates a rule through the self client',
      async ({ apiClient, apiServices, esClient, kbnClient, samlAuth }) => {
        const { name, accountId } = await createAccount(kbnClient, esClient);
        workloadIds.push(name);
        await bindWorkload(kbnClient, name, accountId);
        // The test plugin requires `manage_security` from whoever runs the workload.
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        const executed = await apiClient.post(workloadPath(name), {
          headers: { ...HEADERS, ...cookieHeader },
          body: { operation: 'execute', action: 'create_rule', rule: ruleBody(name) },
          responseType: 'json',
        });
        expect(executed).toHaveStatusCode(200);
        const { status, body } = executed.body as { status: number; body: RuleResponse };
        expect(status).toBe(200);
        ruleIds.push(body.id);
        expect(body.api_key_owner).toBe(accountId);

        expect(await runRule(kbnClient, apiServices.alerting.rules.runSoon, body.id)).toMatchObject(
          {
            num_active_alerts: 1,
          }
        );
      }
    );

    apiTest(
      'a built-in service account gets a 400 that names the account',
      async ({ apiClient, esClient }) => {
        const tokenName = uniqueName();
        const { token } = await esClient.security.createServiceToken({
          namespace: 'elastic',
          service: 'fleet-server',
          name: tokenName,
        });
        builtInTokenNames.push(tokenName);

        const scheduled = await apiClient.post(TASKS_PATH, {
          headers: { ...HEADERS, authorization: `Bearer ${token.value}` },
          responseType: 'json',
        });
        expect(scheduled).toHaveStatusCode(400);
        expect(scheduled.body).toMatchObject({
          message: expect.stringContaining(
            'Unable to grant an API key for service account [elastic/fleet-server]'
          ),
        });
      }
    );
  }
);
