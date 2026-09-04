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
import {
  ALERTING_V2_RULES_ALL_ROLE,
  apiTest,
  buildCreateRuleData,
  getRuleUrl,
  testData,
} from '../fixtures';

const runbook = (content: string, id = 'rb-1') => ({
  id,
  type: RUNBOOK_ARTIFACT_TYPE,
  data: { content },
});

const dashboard = (dashboardId: string, id = 'db-1') => ({
  id,
  type: DASHBOARD_ARTIFACT_TYPE,
  data: { dashboardId },
});

const dashboardReference = (dashboardId: string, artifactId = 'db-1') => ({
  name: `artifact:dashboardId:${artifactId}`,
  type: 'dashboard',
  id: dashboardId,
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

  apiTest(
    'create: round-trips artifacts and extracts a reference only for types that declare one',
    async ({ apiClient, apiServices }) => {
      const artifacts = [runbook('# Steps'), dashboard('my-dashboard')];
      const response = await apiClient.post(testData.RULE_API_PATH, {
        headers: writerHeaders,
        body: buildCreateRuleData({ metadata: { name: 'rule-with-artifacts' }, artifacts }),
      });

      expect(response).toHaveStatusCode(201);
      expect(response.body.artifacts).toStrictEqual(artifacts);

      // The runbook declares no reference fields, so it contributes nothing.
      expect(
        await apiServices.alertingV2.ruleSavedObject.getReferences(response.body.id)
      ).toStrictEqual([dashboardReference('my-dashboard')]);
    }
  );

  apiTest(
    'get: resolves a dashboard id from references rather than stored artifact data',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'rule-to-remap' },
          artifacts: [dashboard('pre-import-id')],
        })
      );

      // Emulate what a saved-object import does: rewrite the reference id and
      // leave the stored `data` pointing at the pre-import id.
      await apiServices.alertingV2.ruleSavedObject.setReferences(created.id, [
        dashboardReference('post-import-id'),
      ]);

      const response = await apiClient.get(getRuleUrl(created.id), {
        headers: writerHeaders,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.artifacts).toStrictEqual([dashboard('post-import-id')]);
    }
  );

  apiTest(
    'patch: an unrelated update preserves a remapped reference',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'rule-to-remap-then-edit' },
          artifacts: [dashboard('pre-import-id')],
        })
      );

      await apiServices.alertingV2.ruleSavedObject.setReferences(created.id, [
        dashboardReference('post-import-id'),
      ]);

      // Rebuilding references from the stale stored `data` here would silently
      // undo the remapping.
      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: { metadata: { description: 'unrelated change' } },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.artifacts).toStrictEqual([dashboard('post-import-id')]);
      expect(await apiServices.alertingV2.ruleSavedObject.getReferences(created.id)).toStrictEqual([
        dashboardReference('post-import-id'),
      ]);
    }
  );

  apiTest(
    'patch: replacing the artifacts array drops references for removed artifacts',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'rule-with-replaced-artifacts' },
          artifacts: [dashboard('first-dashboard')],
        })
      );

      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: { artifacts: [runbook('# Only a runbook now')] },
      });

      expect(response).toHaveStatusCode(200);
      expect(await apiServices.alertingV2.ruleSavedObject.getReferences(created.id)).toStrictEqual(
        []
      );
    }
  );

  apiTest(
    'create: an unregistered artifact type is stored as-is and produces no references',
    async ({ apiClient, apiServices }) => {
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
      expect(
        await apiServices.alertingV2.ruleSavedObject.getReferences(response.body.id)
      ).toStrictEqual([]);
    }
  );

  apiTest(
    'bulk disable: preserves artifacts and a remapped reference',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'rule-bulk-disable-artifacts' },
          artifacts: [dashboard('pre-import-id')],
        })
      );
      await apiServices.alertingV2.ruleSavedObject.setReferences(created.id, [
        dashboardReference('post-import-id'),
      ]);

      const response = await apiClient.post(`${testData.RULE_API_PATH}/_bulk_disable`, {
        headers: writerHeaders,
        body: { ids: [created.id] },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ affected_count: 1, errors: [] });

      const fetched = await apiServices.alertingV2.rules.get(created.id);
      expect(fetched.enabled).toBe(false);
      expect(fetched.artifacts).toStrictEqual([dashboard('post-import-id')]);
      expect(await apiServices.alertingV2.ruleSavedObject.getReferences(created.id)).toStrictEqual([
        dashboardReference('post-import-id'),
      ]);
    }
  );

  apiTest(
    'bulk enable: preserves artifacts and a remapped reference',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'rule-bulk-enable-artifacts' },
          artifacts: [dashboard('pre-import-id')],
        })
      );
      await apiServices.alertingV2.rules.disable(created.id);
      await apiServices.alertingV2.ruleSavedObject.setReferences(created.id, [
        dashboardReference('post-import-id'),
      ]);

      const response = await apiClient.post(`${testData.RULE_API_PATH}/_bulk_enable`, {
        headers: writerHeaders,
        body: { ids: [created.id] },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ affected_count: 1, errors: [] });

      const fetched = await apiServices.alertingV2.rules.get(created.id);
      expect(fetched.enabled).toBe(true);
      expect(fetched.artifacts).toStrictEqual([dashboard('post-import-id')]);
      expect(await apiServices.alertingV2.ruleSavedObject.getReferences(created.id)).toStrictEqual([
        dashboardReference('post-import-id'),
      ]);
    }
  );

  apiTest(
    'bulk update api key: preserves artifacts and a remapped reference',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'rule-bulk-rotate-artifacts' },
          artifacts: [dashboard('pre-import-id')],
        })
      );
      await apiServices.alertingV2.ruleSavedObject.setReferences(created.id, [
        dashboardReference('post-import-id'),
      ]);

      const response = await apiClient.post(`${testData.RULE_API_PATH}/_bulk_update_api_key`, {
        headers: writerHeaders,
        body: { ids: [created.id] },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ affected_count: 1, errors: [] });

      const fetched = await apiServices.alertingV2.rules.get(created.id);
      expect(fetched.artifacts).toStrictEqual([dashboard('post-import-id')]);
      expect(await apiServices.alertingV2.ruleSavedObject.getReferences(created.id)).toStrictEqual([
        dashboardReference('post-import-id'),
      ]);
    }
  );

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
