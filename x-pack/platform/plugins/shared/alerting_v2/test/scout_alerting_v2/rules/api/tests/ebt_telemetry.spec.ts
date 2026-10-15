/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import {
  RULE_CREATED_EBT_EVENT_TYPE,
  RULE_DELETED_EBT_EVENT_TYPE,
  RULE_DISABLED_EBT_EVENT_TYPE,
  RULE_ENABLED_EBT_EVENT_TYPE,
  RULE_UPDATED_EBT_EVENT_TYPE,
} from '../../../../../server/lib/telemetry/rule_changed_event';
import {
  ALERTING_V2_RULES_ALL_ROLE,
  apiTest,
  buildCreateRuleData,
  getDisableRuleUrl,
  getEnableRuleUrl,
  getRuleUrl,
  testData,
} from '../fixtures';

// An API-key request is reported on the `api` channel with no app.
const API_ORIGIN = { actor: 'user', channel: 'api' } as const;

apiTest.describe(
  'Rule changed EBT telemetry',
  { tag: ['@local-stateful-classic', '@local-serverless-observability_complete'] },
  () => {
    let writerHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth, apiServices }) => {
      const writerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_RULES_ALL_ROLE
      );
      writerHeaders = { ...testData.COMMON_HEADERS, ...writerCredentials.apiKeyHeader };
      await apiServices.alertingV2.ebt.optIn();
    });

    apiTest.beforeEach(async ({ apiServices }) => {
      await apiServices.alertingV2.rules.cleanUp();
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.alertingV2.rules.cleanUp();
    });

    apiTest('reports rule.created', async ({ apiClient, apiServices }) => {
      const body = buildCreateRuleData({ metadata: { name: 'ebt-created-rule' } });
      const response = await apiClient.post(testData.RULE_API_PATH, {
        headers: writerHeaders,
        body,
      });
      expect(response).toHaveStatusCode(201);

      const [event] = await apiServices.alertingV2.ebt.waitForRuleChangedEvents({
        ruleId: response.body.id,
        eventType: RULE_CREATED_EBT_EVENT_TYPE,
      });
      expect(event.properties).toMatchObject({
        rule_id: response.body.id,
        kind: body.kind,
        enabled: true,
        origin: API_ORIGIN,
      });
      expect(event.properties.origin.app).toBeUndefined();
    });

    apiTest('reports rule.updated', async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'ebt-rule-to-update' } })
      );
      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: { metadata: { name: 'ebt-renamed-rule' } },
      });
      expect(response).toHaveStatusCode(200);

      const [event] = await apiServices.alertingV2.ebt.waitForRuleChangedEvents({
        ruleId: created.id,
        eventType: RULE_UPDATED_EBT_EVENT_TYPE,
      });
      expect(event.properties).toMatchObject({
        rule_id: created.id,
        enabled: true,
        origin: API_ORIGIN,
      });
      expect(event.properties.origin.app).toBeUndefined();
    });

    apiTest(
      'reports rule.deleted with the enabled state at deletion',
      async ({ apiClient, apiServices }) => {
        const created = await apiServices.alertingV2.rules.create(
          buildCreateRuleData({ metadata: { name: 'ebt-rule-to-delete' } })
        );
        const response = await apiClient.delete(getRuleUrl(created.id), {
          headers: writerHeaders,
        });
        expect(response).toHaveStatusCode(204);

        const [event] = await apiServices.alertingV2.ebt.waitForRuleChangedEvents({
          ruleId: created.id,
          eventType: RULE_DELETED_EBT_EVENT_TYPE,
        });
        expect(event.properties).toMatchObject({
          rule_id: created.id,
          enabled: true,
          origin: API_ORIGIN,
        });
        expect(event.properties.origin.app).toBeUndefined();
      }
    );

    apiTest('reports rule.enabled', async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'ebt-rule-to-enable' } })
      );
      // Start the rule disabled so the endpoint has an actual transition to make.
      await apiServices.alertingV2.rules.bulkDisable({ ids: [created.id] });

      const response = await apiClient.post(getEnableRuleUrl(created.id), {
        headers: writerHeaders,
      });
      expect(response).toHaveStatusCode(200);

      const [event] = await apiServices.alertingV2.ebt.waitForRuleChangedEvents({
        ruleId: created.id,
        eventType: RULE_ENABLED_EBT_EVENT_TYPE,
      });
      expect(event.properties).toMatchObject({
        rule_id: created.id,
        enabled: true,
        origin: API_ORIGIN,
      });
      expect(event.properties.origin.app).toBeUndefined();
    });

    apiTest('reports rule.disabled', async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'ebt-rule-to-disable' } })
      );
      const response = await apiClient.post(getDisableRuleUrl(created.id), {
        headers: writerHeaders,
      });
      expect(response).toHaveStatusCode(200);

      const [event] = await apiServices.alertingV2.ebt.waitForRuleChangedEvents({
        ruleId: created.id,
        eventType: RULE_DISABLED_EBT_EVENT_TYPE,
      });
      expect(event.properties).toMatchObject({
        rule_id: created.id,
        enabled: false,
        origin: API_ORIGIN,
      });
      expect(event.properties.origin.app).toBeUndefined();
    });
  }
);
