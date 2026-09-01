/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import {
  DASHBOARD_ARTIFACT_TYPE,
  RUNBOOK_ARTIFACT_TYPE,
  RUNBOOK_CONTENT_LIMIT,
} from '@kbn/alerting-v2-constants';
import { ALERTING_V2_RULES_ALL_ROLE, apiTest, buildCreateRuleData, testData } from '../fixtures';

const runbook = (content: string, id = 'rb-1') => ({
  id,
  type: RUNBOOK_ARTIFACT_TYPE,
  data: { content },
});

apiTest.describe('Rule artifacts API', { tag: '@local-stateful-classic' }, () => {
  let writerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    const writerCredentials: RoleApiCredentials = await requestAuth.getApiKeyForCustomRole(
      ALERTING_V2_RULES_ALL_ROLE
    );
    writerHeaders = { ...testData.COMMON_HEADERS, ...writerCredentials.apiKeyHeader };
  });

  apiTest.afterEach(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
  });

  apiTest('create: round-trips artifacts of registered types', async ({ apiClient }) => {
    const artifacts = [
      runbook('# Steps'),
      { id: 'db-1', type: DASHBOARD_ARTIFACT_TYPE, data: { dashboardId: 'my-dashboard' } },
    ];
    const response = await apiClient.post(testData.RULE_API_PATH, {
      headers: writerHeaders,
      body: buildCreateRuleData({ metadata: { name: 'rule-with-artifacts' }, artifacts }),
    });

    expect(response).toHaveStatusCode(201);
    expect(response.body.artifacts).toStrictEqual(artifacts);
  });

  apiTest('create: an unregistered artifact type is stored as-is', async ({ apiClient }) => {
    // Framework agnosticism: solution-owned types must not need a framework
    // change to be accepted.
    const artifacts = [
      { id: 'custom-1', type: 'obs.custom', data: { anything: true, nested: { ok: 1 } } },
    ];
    const response = await apiClient.post(testData.RULE_API_PATH, {
      headers: writerHeaders,
      body: buildCreateRuleData({ metadata: { name: 'rule-unregistered-type' }, artifacts }),
    });

    expect(response).toHaveStatusCode(201);
    expect(response.body.artifacts).toStrictEqual(artifacts);
  });

  apiTest(
    'validation: rejects whitespace-only runbook content with INVALID_ARTIFACT_DATA',
    async ({ apiClient }) => {
      const response = await apiClient.post(testData.RULE_API_PATH, {
        headers: writerHeaders,
        body: buildCreateRuleData({ artifacts: [runbook('   ')] }),
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('INVALID_ARTIFACT_DATA');
      expect(response.body.message).toContain(
        'content: must not be empty or contain only whitespace'
      );
      expect(response.body.details).toMatchObject({
        artifact_id: 'rb-1',
        artifact_type: RUNBOOK_ARTIFACT_TYPE,
      });
    }
  );

  apiTest(
    'validation: rejects an undeclared field because registered schemas are closed',
    async ({ apiClient }) => {
      const response = await apiClient.post(testData.RULE_API_PATH, {
        headers: writerHeaders,
        body: buildCreateRuleData({
          artifacts: [
            { id: 'rb-1', type: RUNBOOK_ARTIFACT_TYPE, data: { content: 'ok', undeclared: 'x' } },
          ],
        }),
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('INVALID_ARTIFACT_DATA');
      expect(response.body.message).toContain('Unrecognized key: "undeclared"');
    }
  );

  apiTest('validation: rejects runbook content above the per-type limit', async ({ apiClient }) => {
    const response = await apiClient.post(testData.RULE_API_PATH, {
      headers: writerHeaders,
      body: buildCreateRuleData({
        artifacts: [runbook('a'.repeat(RUNBOOK_CONTENT_LIMIT + 1))],
      }),
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('INVALID_ARTIFACT_DATA');
    expect(response.body.message).toContain(
      `expected string to have <=${RUNBOOK_CONTENT_LIMIT} characters`
    );
  });

  apiTest(
    'validation: rejects a missing required field for a registered type',
    async ({ apiClient }) => {
      const response = await apiClient.post(testData.RULE_API_PATH, {
        headers: writerHeaders,
        body: buildCreateRuleData({
          artifacts: [{ id: 'db-1', type: DASHBOARD_ARTIFACT_TYPE, data: {} }],
        }),
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('INVALID_ARTIFACT_DATA');
      expect(response.body.message).toContain('dashboardId');
    }
  );

  apiTest('validation: rejects duplicate artifact ids', async ({ apiClient }) => {
    const response = await apiClient.post(testData.RULE_API_PATH, {
      headers: writerHeaders,
      body: buildCreateRuleData({
        artifacts: [runbook('first', 'dup'), runbook('second', 'dup')],
      }),
    });

    // The envelope schema catches this before the registry sees the artifact.
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
    expect(response.body.message).toContain('must be unique within the rule');
  });

  apiTest(
    'validation: an unregistered type is never rejected, even with large data',
    async ({ apiClient }) => {
      // The owning plugin may be disabled or rolled back; a payload that was
      // legal under its registered schema (e.g. content up to 50k) must still
      // write. Limits are enforced once, at registration.
      const artifacts = [
        { id: 'custom-1', type: 'obs.custom', data: { blob: 'a'.repeat(RUNBOOK_CONTENT_LIMIT) } },
      ];
      const response = await apiClient.post(testData.RULE_API_PATH, {
        headers: writerHeaders,
        body: buildCreateRuleData({ metadata: { name: 'rule-large-unregistered' }, artifacts }),
      });

      expect(response).toHaveStatusCode(201);
      expect(response.body.artifacts).toStrictEqual(artifacts);
    }
  );

  apiTest(
    'validation: a registered type accepts data at its declared limit',
    async ({ apiClient }) => {
      const response = await apiClient.post(testData.RULE_API_PATH, {
        headers: writerHeaders,
        body: buildCreateRuleData({
          metadata: { name: 'rule-large-runbook' },
          artifacts: [runbook('a'.repeat(RUNBOOK_CONTENT_LIMIT))],
        }),
      });

      expect(response).toHaveStatusCode(201);
    }
  );
});
