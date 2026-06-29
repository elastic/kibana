/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { ApiClientFixture, SamlAuth, ScoutTestConfig } from '@kbn/scout';
import { nodeBuilder } from '@kbn/es-query';
import { COMMON_HEADERS } from '../fixtures/constants';
import { waitForSuccessfulEventLogEntry } from '../lib/wait_for_successful_event_log';

const FIND_MUTED_ALERTS_PATH = 'internal/alerting/rules/_find_muted_alerts';

const ES_QUERY_PARAMS = {
  index: ['.kibana-event-log-*'],
  timeField: '@timestamp',
  esQuery: '{\n  "query":{\n    "match_all" : {}\n  }\n}',
  size: 100,
  timeWindowSize: 5,
  timeWindowUnit: 'm',
  thresholdComparator: '>',
  threshold: [0],
  searchType: 'esQuery',
  excludeHitsFromPreviousRun: true,
  aggType: 'count',
  groupBy: 'all',
};

/**
 * Feature/consumer availability mirrors `getDeploymentConfig` in
 * `alert_actions_authorization.spec.ts`: the `stackAlerts` feature (consumer
 * `alerts`) is hidden in serverless observability, while the `logs` feature
 * (consumer `logs`) only exists where observability is present (stateful or
 * serverless observability). On stateful both features coexist, so all four
 * privilege combinations run there.
 */
const isStackAlertsAvailable = (config: ScoutTestConfig): boolean =>
  !(config.serverless && config.projectType === 'oblt');

const isLogsAvailable = (config: ScoutTestConfig): boolean =>
  !config.serverless || config.projectType === 'oblt';

const buildRuleFilter = (ruleId: string): string =>
  JSON.stringify(nodeBuilder.or([nodeBuilder.is('alert.id', `alert:${ruleId}`)]));

interface FindMutedAlertsResponseBody {
  page: number;
  per_page: number;
  total: number;
  data: Array<{ id: string; muted_alert_ids: string[] }>;
}

// The .es-query rule type uses instance ID 'query matched' when group by is 'all'.
const ALERT_INSTANCE_ID = 'query matched';
const ENCODED_ALERT_INSTANCE_ID = 'query%20matched';

apiTest.describe('Find muted alerts', { tag: tags.deploymentAgnostic }, () => {
  let stackRuleId: string | undefined;
  let logsRuleId: string | undefined;

  apiTest.beforeAll(async ({ apiClient, samlAuth, config }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    const adminHeaders = { ...COMMON_HEADERS, ...cookieHeader };

    const createMutedRule = async (consumer: string): Promise<string> => {
      const ruleResponse = await apiClient.post('api/alerting/rule', {
        headers: adminHeaders,
        body: {
          name: `Scout find-muted-alerts ${consumer} rule`,
          rule_type_id: '.es-query',
          consumer,
          schedule: { interval: '1m' },
          enabled: true,
          params: ES_QUERY_PARAMS,
          actions: [],
          tags: ['scout-find-muted-alerts'],
        },
        responseType: 'json',
      });
      expect(ruleResponse).toHaveStatusCode(200);
      const ruleId = (ruleResponse.body as { id: string }).id;

      // Let the rule execute so the 'query matched' alert instance actually exists,
      // then mute that real instance (validate_alerts_existence defaults to true).
      await waitForSuccessfulEventLogEntry(apiClient, ruleId, adminHeaders);

      const muteResponse = await apiClient.post(
        `api/alerting/rule/${ruleId}/alert/${ENCODED_ALERT_INSTANCE_ID}/_mute`,
        { headers: adminHeaders }
      );
      expect(muteResponse).toHaveStatusCode(204);

      return ruleId;
    };

    if (isStackAlertsAvailable(config)) {
      stackRuleId = await createMutedRule('alerts');
    }
    if (isLogsAvailable(config)) {
      logsRuleId = await createMutedRule('logs');
    }
  });

  apiTest.afterAll(async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    const adminHeaders = { ...COMMON_HEADERS, ...cookieHeader };

    for (const ruleId of [stackRuleId, logsRuleId]) {
      if (ruleId) {
        await apiClient.delete(`api/alerting/rule/${ruleId}`, { headers: adminHeaders });
      }
    }
  });

  const expectValidResponseShape = (body: FindMutedAlertsResponseBody): void => {
    expect(typeof body.page).toBe('number');
    expect(typeof body.per_page).toBe('number');
    expect(typeof body.total).toBe('number');
    expect(Array.isArray(body.data)).toBe(true);

    for (const record of body.data) {
      // Each entry must expose exactly the muted-alert contract (id + muted_alert_ids)
      // and never leak additional rule attributes.
      expect(Object.keys(record).sort()).toStrictEqual(['id', 'muted_alert_ids']);
      expect(typeof record.id).toBe('string');
      expect(Array.isArray(record.muted_alert_ids)).toBe(true);
      for (const alertId of record.muted_alert_ids) {
        expect(typeof alertId).toBe('string');
      }
    }
  };

  const expectMutedAlertReturned = (
    body: FindMutedAlertsResponseBody,
    ruleId: string,
    instanceId: string
  ): void => {
    const record = body.data.find((rule) => rule.id === ruleId);
    expect(record).toBeDefined();
    expect(record!.muted_alert_ids).toContain(instanceId);
  };

  const findMutedAlertsAs = async (
    apiClient: ApiClientFixture,
    samlAuth: SamlAuth,
    feature: string,
    privilege: 'read' | 'all',
    ruleId: string,
    instanceId: string
  ): Promise<void> => {
    const { cookieHeader } = await samlAuth.asInteractiveUser({
      kibana: [{ base: [], feature: { [feature]: [privilege] }, spaces: ['*'] }],
      elasticsearch: { cluster: [], indices: [] },
    });

    const response = await apiClient.post(FIND_MUTED_ALERTS_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      body: { filter: buildRuleFilter(ruleId), page: 1, per_page: 10 },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    const body = response.body as FindMutedAlertsResponseBody;
    expectValidResponseShape(body);
    expectMutedAlertReturned(body, ruleId, instanceId);
  };

  apiTest(
    'is accessible with Stack Rules read privilege',
    async ({ apiClient, samlAuth, config }) => {
      apiTest.skip(
        !isStackAlertsAvailable(config),
        'stackAlerts feature is unavailable on this deployment'
      );
      await findMutedAlertsAs(
        apiClient,
        samlAuth,
        'stackAlerts',
        'read',
        stackRuleId!,
        ALERT_INSTANCE_ID
      );
    }
  );

  apiTest(
    'is accessible with Stack Rules all privilege',
    async ({ apiClient, samlAuth, config }) => {
      apiTest.skip(
        !isStackAlertsAvailable(config),
        'stackAlerts feature is unavailable on this deployment'
      );
      await findMutedAlertsAs(
        apiClient,
        samlAuth,
        'stackAlerts',
        'all',
        stackRuleId!,
        ALERT_INSTANCE_ID
      );
    }
  );

  apiTest('is accessible with Logs read privilege', async ({ apiClient, samlAuth, config }) => {
    apiTest.skip(!isLogsAvailable(config), 'logs feature is unavailable on this deployment');
    await findMutedAlertsAs(apiClient, samlAuth, 'logs', 'read', logsRuleId!, ALERT_INSTANCE_ID);
  });

  apiTest('is accessible with Logs all privilege', async ({ apiClient, samlAuth, config }) => {
    apiTest.skip(!isLogsAvailable(config), 'logs feature is unavailable on this deployment');
    await findMutedAlertsAs(apiClient, samlAuth, 'logs', 'all', logsRuleId!, ALERT_INSTANCE_ID);
  });
});
