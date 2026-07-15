/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nodeBuilder } from '@kbn/es-query';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import { COMMON_HEADERS, DEPLOYMENT_AGNOSTIC_WITHOUT_SERVERLESS_OBS } from '../fixtures/constants';
import {
  RULE_SPECS,
  FAKE_ALERT_INSTANCE_ID,
  setupStackAlertsPrivilegeTests,
  teardownStackAlertsPrivilegeTests,
  type StackAlertsPrivilegeState,
} from '../lib/stack_alerts_privilege_setup';

const buildRuleFilter = (ruleId: string): string =>
  JSON.stringify(nodeBuilder.or([nodeBuilder.is('alert.id', `alert:${ruleId}`)]));

apiTest.describe(
  'Stack alerts privilege - read privilege',
  { tag: DEPLOYMENT_AGNOSTIC_WITHOUT_SERVERLESS_OBS },
  () => {
    let state: StackAlertsPrivilegeState;
    let withReadPrivilegeCreds: RoleApiCredentials;
    let withReadPrivilegeCookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ apiClient, requestAuth, samlAuth }) => {
      state = await setupStackAlertsPrivilegeTests(apiClient, requestAuth, samlAuth);

      withReadPrivilegeCreds = await requestAuth.getApiKeyForCustomRole({
        kibana: [{ base: [], feature: { stackAlertsOnly: ['read'] }, spaces: ['*'] }],
        elasticsearch: { cluster: [], indices: [] },
      });

      const session = await samlAuth.asInteractiveUser({
        kibana: [{ base: [], feature: { stackAlertsOnly: ['read'] }, spaces: ['*'] }],
        elasticsearch: { cluster: [], indices: [] },
      });
      withReadPrivilegeCookieHeader = session.cookieHeader;
    });

    apiTest.afterAll(async ({ apiClient }) => {
      await teardownStackAlertsPrivilegeTests(apiClient, state);
    });

    apiTest('can find alerts via RAC', async ({ apiClient }) => {
      const response = await apiClient.post('internal/rac/alerts/find', {
        headers: { ...COMMON_HEADERS, ...withReadPrivilegeCookieHeader },
        body: {
          rule_type_ids: ['.es-query'],
          consumers: ['stackAlerts'],
          query: { match_all: {} },
          size: 10,
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);

      const body = response.body as {
        hits?: { total?: { value?: number }; hits?: Array<{ _source: Record<string, unknown> }> };
      };
      expect(body.hits?.total?.value).toBeGreaterThan(0);
    });

    apiTest('can read muted alert state via _find_muted_alerts', async ({ apiClient }) => {
      const response = await apiClient.post('internal/alerting/rules/_find_muted_alerts', {
        headers: { ...COMMON_HEADERS, ...withReadPrivilegeCookieHeader },
        body: {
          filter: buildRuleFilter(state.enabledRuleId),
          page: 1,
          per_page: 100,
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);

      const body = response.body as {
        data: Array<{ id: string; muted_alert_instance_ids: string[] }>;
      };
      const record = body.data.find((rule) => rule.id === state.enabledRuleId);
      expect(record?.muted_alert_instance_ids).toContain(state.mutedAlertInstanceId);
    });

    for (const spec of RULE_SPECS) {
      apiTest(`cannot mute an alert instance for ${spec.ruleTypeId}`, async ({ apiClient }) => {
        const rule = state.createdRules.find((r) => r.ruleTypeId === spec.ruleTypeId)!;
        const response = await apiClient.post(
          `api/alerting/rule/${rule.ruleId}/alert/${FAKE_ALERT_INSTANCE_ID}/_mute?validate_alerts_existence=false`,
          { headers: { ...COMMON_HEADERS, ...withReadPrivilegeCreds.apiKeyHeader } }
        );
        expect(response).toHaveStatusCode(403);
      });
    }

    apiTest('cannot acknowledge an alert via bulk update', async ({ apiClient }) => {
      const response = await apiClient.post('internal/rac/alerts/bulk_update', {
        headers: { ...COMMON_HEADERS, ...withReadPrivilegeCookieHeader },
        body: {
          status: 'acknowledged',
          ids: [state.realAlertId],
          index: state.realAlertIndex,
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(403);
    });

    apiTest('cannot create a rule', async ({ apiClient }) => {
      const spec = RULE_SPECS[0];
      const response = await apiClient.post('api/alerting/rule', {
        headers: { ...COMMON_HEADERS, ...withReadPrivilegeCreds.apiKeyHeader },
        body: {
          name: 'Should fail',
          rule_type_id: spec.ruleTypeId,
          consumer: spec.consumer,
          schedule: { interval: '1m' },
          enabled: false,
          params: spec.params,
          actions: [],
          tags: [],
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(403);
    });
  }
);
