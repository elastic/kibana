/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import {
  ACTION_POLICY_CREATED_EBT_EVENT_TYPE,
  ACTION_POLICY_DELETED_EBT_EVENT_TYPE,
  ACTION_POLICY_DISABLED_EBT_EVENT_TYPE,
  ACTION_POLICY_ENABLED_EBT_EVENT_TYPE,
  ACTION_POLICY_UPDATED_EBT_EVENT_TYPE,
} from '../../../../../server/lib/telemetry/action_policy_ebt_schema';
import {
  ALERTING_V2_ACTION_POLICIES_ALL_AND_RULES_READ_ROLE,
  apiTest,
  buildCreateActionPolicyData,
  getActionPolicyUrl,
  getBulkDeleteActionPoliciesUrl,
  getBulkDisableActionPoliciesUrl,
  getDisableActionPolicyUrl,
  getEnableActionPolicyUrl,
  testData,
} from '../fixtures';

// An API-key request is reported on the `api` channel with no app.
const API_ORIGIN = { actor: 'user', channel: 'api' } as const;

apiTest.describe(
  'Action policy changed EBT telemetry',
  { tag: ['@local-stateful-classic', '@local-serverless-observability_complete'] },
  () => {
    let writerHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth, apiServices }) => {
      const writerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_ACTION_POLICIES_ALL_AND_RULES_READ_ROLE
      );
      writerHeaders = { ...testData.COMMON_HEADERS, ...writerCredentials.apiKeyHeader };
      await apiServices.alertingV2.ebt.optIn();
    });

    apiTest.beforeEach(async ({ apiServices }) => {
      await apiServices.alertingV2.actionPolicies.cleanUp();
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.alertingV2.actionPolicies.cleanUp();
      await apiServices.alertingV2.ebt.optOut();
    });

    apiTest('reports a created event', async ({ apiClient, apiServices }) => {
      const body = buildCreateActionPolicyData({ name: 'ebt-created-policy' });
      const response = await apiClient.post(testData.ACTION_POLICY_API_PATH, {
        headers: writerHeaders,
        body,
      });
      expect(response).toHaveStatusCode(201);

      const [event] = await apiServices.alertingV2.ebt.waitForActionPolicyChangedEvents({
        actionPolicyId: response.body.id,
        eventType: ACTION_POLICY_CREATED_EBT_EVENT_TYPE,
      });
      expect(event.properties).toMatchObject({
        action_policy_id: response.body.id,
        space_id: 'default',
        enabled: true,
        destination_count: body.destinations.length,
        snoozed: false,
        origin: API_ORIGIN,
      });
      expect(event.properties.origin.app).toBeUndefined();
    });

    apiTest('reports an updated event for a PATCH', async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'ebt-policy-to-update' })
      );
      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: writerHeaders,
        body: { name: 'ebt-renamed-policy' },
      });
      expect(response).toHaveStatusCode(200);

      const [event] = await apiServices.alertingV2.ebt.waitForActionPolicyChangedEvents({
        actionPolicyId: created.id,
        eventType: ACTION_POLICY_UPDATED_EBT_EVENT_TYPE,
      });
      expect(event.properties).toMatchObject({
        action_policy_id: created.id,
        enabled: true,
        origin: API_ORIGIN,
      });
      expect(event.properties.origin.app).toBeUndefined();
    });

    apiTest(
      'reports an updated event when a PUT replaces a policy',
      async ({ apiClient, apiServices }) => {
        const created = await apiServices.alertingV2.actionPolicies.create(
          buildCreateActionPolicyData({ name: 'ebt-policy-to-replace' })
        );
        const response = await apiClient.put(getActionPolicyUrl(created.id), {
          headers: writerHeaders,
          body: buildCreateActionPolicyData({ name: 'ebt-replaced-policy' }),
        });
        expect(response).toHaveStatusCode(200);

        const [event] = await apiServices.alertingV2.ebt.waitForActionPolicyChangedEvents({
          actionPolicyId: created.id,
          eventType: ACTION_POLICY_UPDATED_EBT_EVENT_TYPE,
        });
        expect(event.properties).toMatchObject({
          action_policy_id: created.id,
          origin: API_ORIGIN,
        });
        expect(event.properties.origin.app).toBeUndefined();
      }
    );

    apiTest(
      'reports a deleted event with the enabled state at deletion',
      async ({ apiClient, apiServices }) => {
        const created = await apiServices.alertingV2.actionPolicies.create(
          buildCreateActionPolicyData({ name: 'ebt-policy-to-delete' })
        );
        await apiServices.alertingV2.actionPolicies.disable(created.id);

        const response = await apiClient.delete(getActionPolicyUrl(created.id), {
          headers: writerHeaders,
        });
        expect(response).toHaveStatusCode(204);

        const [event] = await apiServices.alertingV2.ebt.waitForActionPolicyChangedEvents({
          actionPolicyId: created.id,
          eventType: ACTION_POLICY_DELETED_EBT_EVENT_TYPE,
        });
        expect(event.properties).toMatchObject({
          action_policy_id: created.id,
          enabled: false,
          origin: API_ORIGIN,
        });
        expect(event.properties.origin.app).toBeUndefined();
      }
    );

    apiTest('reports an enabled event', async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'ebt-policy-to-enable' })
      );
      // Start the policy disabled so the endpoint has an actual transition to make.
      await apiServices.alertingV2.actionPolicies.disable(created.id);

      const response = await apiClient.post(getEnableActionPolicyUrl(created.id), {
        headers: writerHeaders,
      });
      expect(response).toHaveStatusCode(200);

      const [event] = await apiServices.alertingV2.ebt.waitForActionPolicyChangedEvents({
        actionPolicyId: created.id,
        eventType: ACTION_POLICY_ENABLED_EBT_EVENT_TYPE,
      });
      expect(event.properties).toMatchObject({
        action_policy_id: created.id,
        enabled: true,
        origin: API_ORIGIN,
      });
      expect(event.properties.origin.app).toBeUndefined();
    });

    apiTest('reports a disabled event', async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'ebt-policy-to-disable' })
      );
      const response = await apiClient.post(getDisableActionPolicyUrl(created.id), {
        headers: writerHeaders,
      });
      expect(response).toHaveStatusCode(200);

      const [event] = await apiServices.alertingV2.ebt.waitForActionPolicyChangedEvents({
        actionPolicyId: created.id,
        eventType: ACTION_POLICY_DISABLED_EBT_EVENT_TYPE,
      });
      expect(event.properties).toMatchObject({
        action_policy_id: created.id,
        enabled: false,
        origin: API_ORIGIN,
      });
      expect(event.properties.origin.app).toBeUndefined();
    });

    apiTest(
      'reports one disabled event per policy for a bulk disable',
      async ({ apiClient, apiServices }) => {
        const first = await apiServices.alertingV2.actionPolicies.create(
          buildCreateActionPolicyData({ name: 'ebt-bulk-disable-1' })
        );
        const second = await apiServices.alertingV2.actionPolicies.create(
          buildCreateActionPolicyData({ name: 'ebt-bulk-disable-2' })
        );

        const response = await apiClient.post(getBulkDisableActionPoliciesUrl(), {
          headers: writerHeaders,
          body: { ids: [first.id, second.id] },
        });
        expect(response).toHaveStatusCode(200);
        expect(response.body.affected_count).toBe(2);

        for (const { id } of [first, second]) {
          const [event] = await apiServices.alertingV2.ebt.waitForActionPolicyChangedEvents({
            actionPolicyId: id,
            eventType: ACTION_POLICY_DISABLED_EBT_EVENT_TYPE,
          });
          expect(event.properties).toMatchObject({
            action_policy_id: id,
            enabled: false,
            origin: API_ORIGIN,
          });
        }
      }
    );

    apiTest(
      'reports one deleted event per policy for a bulk delete',
      async ({ apiClient, apiServices }) => {
        const first = await apiServices.alertingV2.actionPolicies.create(
          buildCreateActionPolicyData({ name: 'ebt-bulk-delete-1' })
        );
        const second = await apiServices.alertingV2.actionPolicies.create(
          buildCreateActionPolicyData({ name: 'ebt-bulk-delete-2' })
        );

        const response = await apiClient.post(getBulkDeleteActionPoliciesUrl(), {
          headers: writerHeaders,
          body: { ids: [first.id, second.id] },
        });
        expect(response).toHaveStatusCode(200);
        expect(response.body.affected_count).toBe(2);

        for (const { id } of [first, second]) {
          const [event] = await apiServices.alertingV2.ebt.waitForActionPolicyChangedEvents({
            actionPolicyId: id,
            eventType: ACTION_POLICY_DELETED_EBT_EVENT_TYPE,
          });
          expect(event.properties).toMatchObject({
            action_policy_id: id,
            enabled: true,
            origin: API_ORIGIN,
          });
        }
      }
    );
  }
);
