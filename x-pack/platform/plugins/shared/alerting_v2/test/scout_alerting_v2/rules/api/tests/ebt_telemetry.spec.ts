/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * This spec asserts the EBT events produced by rule changes, not the HTTP
 * contract of the rules API. Rules are managed through
 * `apiServices.alertingV2.rules`, so the apiClient requirement does not apply.
 */

/* eslint-disable @kbn/eslint/scout_require_api_client_in_api_test */

import { expect } from '@kbn/scout/api';
import {
  RULE_CREATED_EBT_EVENT_TYPE,
  RULE_DELETED_EBT_EVENT_TYPE,
  RULE_DISABLED_EBT_EVENT_TYPE,
  RULE_ENABLED_EBT_EVENT_TYPE,
  RULE_UPDATED_EBT_EVENT_TYPE,
} from '../../../../../server/lib/telemetry/rule_ebt_schema';
import { apiTest, buildCreateRuleData } from '../fixtures';

// The rules service sends a non-UI request, reported on the `api` channel with no app.
const API_ORIGIN = { actor: 'user', channel: 'api' } as const;

apiTest.describe(
  'Rule changed EBT telemetry',
  { tag: ['@local-stateful-classic', '@local-serverless-observability_complete'] },
  () => {
    apiTest.beforeAll(async ({ apiServices }) => {
      await apiServices.alertingV2.ebt.optIn();
    });

    apiTest.beforeEach(async ({ apiServices }) => {
      await apiServices.alertingV2.rules.cleanUp();
    });

    apiTest.afterAll(async ({ apiServices }) => {
      try {
        await apiServices.alertingV2.rules.cleanUp();
      } finally {
        await apiServices.alertingV2.ebt.optOut();
      }
    });

    apiTest('reports rule.created', async ({ apiServices }) => {
      const body = buildCreateRuleData({ metadata: { name: 'ebt-created-rule' } });
      const created = await apiServices.alertingV2.rules.create(body);

      const [event] = await apiServices.alertingV2.ebt.waitForRuleChangedEvents({
        ruleId: created.id,
        eventType: RULE_CREATED_EBT_EVENT_TYPE,
      });
      expect(event.properties).toMatchObject({
        rule_id: created.id,
        kind: body.kind,
        enabled: true,
        origin: API_ORIGIN,
      });
      expect(event.properties.origin.app).toBeUndefined();
    });

    apiTest('reports rule.updated', async ({ apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'ebt-rule-to-update' } })
      );
      await apiServices.alertingV2.rules.update(created.id, {
        metadata: { name: 'ebt-renamed-rule' },
      });

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

    apiTest('reports rule.deleted with the enabled state at deletion', async ({ apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'ebt-rule-to-delete' } })
      );
      await apiServices.alertingV2.rules.delete(created.id);

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
    });

    apiTest('reports rule.enabled', async ({ apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'ebt-rule-to-enable' } })
      );
      // Start the rule disabled so enable has an actual transition to make.
      await apiServices.alertingV2.rules.disable(created.id);

      await apiServices.alertingV2.rules.enable(created.id);

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

    apiTest('reports rule.disabled', async ({ apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'ebt-rule-to-disable' } })
      );
      await apiServices.alertingV2.rules.disable(created.id);

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
