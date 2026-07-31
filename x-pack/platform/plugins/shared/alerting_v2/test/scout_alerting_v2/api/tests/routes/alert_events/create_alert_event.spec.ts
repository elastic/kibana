/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import {
  ALERTING_V2_ALERTS_ALL_ROLE,
  ALERTING_V2_ALERTS_READ_ROLE,
  apiTest,
  CREATE_ALERT_EVENT_URL,
  getCreateAlertEventBySourceUrl,
  NO_ACCESS_ROLE,
  testData,
} from '../../../fixtures';

apiTest.describe('Create alert event API', { tag: '@local-stateful-classic' }, () => {
  let writerCredentials: RoleApiCredentials;
  let writerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    writerCredentials = await requestAuth.getApiKeyForCustomRole(ALERTING_V2_ALERTS_ALL_ROLE);
    writerHeaders = { ...testData.COMMON_HEADERS, ...writerCredentials.apiKeyHeader };
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.ruleEvents.cleanUp();
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.ruleEvents.cleanUp();
  });

  apiTest(
    'POST /alerts: creates an external alert event when source is in the body',
    async ({ apiClient, apiServices }) => {
      const response = await apiClient.post(CREATE_ALERT_EVENT_URL, {
        headers: writerHeaders,
        body: {
          source: 'datadog',
          fingerprint: 'scout-body-source-fp',
          data: { rule_name: 'High CPU', alert_url: 'https://app.datadoghq.com/monitors/1' },
          severity: 'high',
        },
      });

      expect(response).toHaveStatusCode(201);
      expect(typeof response.body.group_hash).toBe('string');
      expect(typeof response.body.episode_id).toBe('string');
      expect(response.body.episode_url).toBeUndefined();

      const doc = await apiServices.alertingV2.ruleEvents.findByGroupHash(response.body.group_hash);
      expect(doc).toMatchObject({
        source: 'datadog',
        type: 'alert',
        status: 'breached',
        space_id: 'default',
        data: {
          rule_name: 'High CPU',
          alert_url: 'https://app.datadoghq.com/monitors/1',
        },
      });
      expect(doc?.rule).toBeUndefined();
    }
  );

  apiTest(
    'POST /alerts/:source: creates an external alert event when source is in the path',
    async ({ apiClient, apiServices }) => {
      const response = await apiClient.post(getCreateAlertEventBySourceUrl('pagerduty'), {
        headers: writerHeaders,
        body: {
          rule_id: 'scout-path-source-rule',
          alert_status: 'active',
        },
      });

      expect(response).toHaveStatusCode(201);
      expect(typeof response.body.group_hash).toBe('string');
      expect(typeof response.body.episode_id).toBe('string');
      expect(response.body.episode_url).toBeUndefined();

      const doc = await apiServices.alertingV2.ruleEvents.findByGroupHash(response.body.group_hash);
      expect(doc).toMatchObject({
        source: 'pagerduty',
        type: 'alert',
        status: 'breached',
      });
      expect(doc?.rule).toBeUndefined();
    }
  );

  apiTest('schema: rejects a body missing identity fields with 400', async ({ apiClient }) => {
    const response = await apiClient.post(CREATE_ALERT_EVENT_URL, {
      headers: writerHeaders,
      body: { source: 'datadog' },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('schema: rejects a reserved elastic.* source with 400', async ({ apiClient }) => {
    const response = await apiClient.post(CREATE_ALERT_EVENT_URL, {
      headers: writerHeaders,
      body: { source: 'elastic.rules', fingerprint: 'fp-1' },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('schema: rejects a reserved bare "elastic" source with 400', async ({ apiClient }) => {
    const response = await apiClient.post(CREATE_ALERT_EVENT_URL, {
      headers: writerHeaders,
      body: { source: 'elastic', fingerprint: 'fp-1' },
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'authorization: returns 403 for a user with read-only alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_ALERTS_READ_ROLE
      );
      const response = await apiClient.post(CREATE_ALERT_EVENT_URL, {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
        body: { source: 'datadog', fingerprint: 'scout-authz-read-fp' },
      });
      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest(
    'authorization: returns 403 for a user without alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
      const response = await apiClient.post(CREATE_ALERT_EVENT_URL, {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
        body: { source: 'datadog', fingerprint: 'scout-authz-none-fp' },
      });
      expect(response).toHaveStatusCode(403);
    }
  );
});
