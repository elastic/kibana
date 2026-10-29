/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import type {
  ListRuleChangeHistoryResponse,
  RuleChangeHistoryDetail,
  RuleResponse,
} from '@kbn/alerting-v2-schemas';
import { RuleChangesHistoryAction } from '../../../../../server/lib/rule_changes_history/audit_actions';
import {
  ALERTING_V2_RULES_ALL_ROLE,
  ALERTING_V2_RULES_READ_ROLE,
  apiTest,
  buildCreateRuleData,
  testData,
} from '../fixtures';

const CHANGE_HISTORY_URL = testData.INTERNAL_CHANGE_HISTORY_RULES_API_PATH;

apiTest.describe('Rule change history API', { tag: testData.API_ENGINE_NON_MKI_TAG }, () => {
  let readerHeaders: Record<string, string>;
  let writerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ apiServices, requestAuth }) => {
    await apiServices.alertingV2.rules.cleanUp();

    const readerCredentials: RoleApiCredentials = await requestAuth.getApiKeyForCustomRole(
      ALERTING_V2_RULES_READ_ROLE
    );
    readerHeaders = { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader };

    const writerCredentials: RoleApiCredentials = await requestAuth.getApiKeyForCustomRole(
      ALERTING_V2_RULES_ALL_ROLE
    );
    writerHeaders = { ...testData.COMMON_HEADERS, ...writerCredentials.apiKeyHeader };
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
  });

  apiTest(
    'list + detail: returns lean rows with server-side diffs and full snapshots on detail',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'change-history-http-list' },
          schedule: { every: '1d' },
        })
      );

      await apiServices.alertingV2.ruleChangesHistory.waitForAtLeast(1, {
        ruleId: created.id,
        action: RuleChangesHistoryAction.ruleCreate,
      });

      const updated = await apiServices.alertingV2.rules.upsert(
        created.id,
        buildCreateRuleData({
          metadata: { name: 'change-history-http-updated' },
          schedule: { every: '1d' },
        })
      );

      await apiServices.alertingV2.ruleChangesHistory.waitForAtLeast(1, {
        ruleId: created.id,
        action: RuleChangesHistoryAction.ruleUpdate,
      });

      const listResponse = await apiClient.get(
        `${CHANGE_HISTORY_URL}?rule_id=${encodeURIComponent(created.id)}&page=1&per_page=20`,
        { headers: readerHeaders }
      );

      expect(listResponse).toHaveStatusCode(200);

      const list: ListRuleChangeHistoryResponse = listResponse.body;

      expect(list.total).toBeGreaterThanOrEqual(2);
      expect(list.items.length).toBeGreaterThanOrEqual(2);
      expect(list.items[0]).toMatchObject({
        action: RuleChangesHistoryAction.ruleUpdate,
        is_current: true,
        version: 2,
      });
      expect(list.items[0].version).toBe(updated.version);
      expect('snapshot' in list.items[0]).toBe(false);
      expect(list.items[0].changes?.count).toBeGreaterThan(0);
      expect(list.items[0].changes?.summary).toStrictEqual(
        expect.objectContaining({
          metadata: expect.objectContaining({ name: 'change-history-http-list' }),
        })
      );

      const detailResponse = await apiClient.get(
        `${CHANGE_HISTORY_URL}/${encodeURIComponent(list.items[0].id)}`,
        { headers: readerHeaders }
      );

      expect(detailResponse).toHaveStatusCode(200);

      const detail: RuleChangeHistoryDetail = detailResponse.body;

      expect(detail.id).toBe(list.items[0].id);
      expect(detail.snapshot).toMatchObject({
        id: created.id,
        metadata: expect.objectContaining({ name: 'change-history-http-updated' }),
      });
      expect(detail.version).toBe(updated.version);
      expect(detail.is_current).toBe(true);
    }
  );

  apiTest(
    'detail: resolves an older event from the change id alone, without a rule id',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'change-history-http-detail-original' },
          schedule: { every: '1d' },
        })
      );

      await apiServices.alertingV2.ruleChangesHistory.waitForAtLeast(1, {
        ruleId: created.id,
        action: RuleChangesHistoryAction.ruleCreate,
      });

      await apiServices.alertingV2.rules.upsert(
        created.id,
        buildCreateRuleData({
          metadata: { name: 'change-history-http-detail-renamed' },
          schedule: { every: '1d' },
        })
      );

      await apiServices.alertingV2.ruleChangesHistory.waitForAtLeast(1, {
        ruleId: created.id,
        action: RuleChangesHistoryAction.ruleUpdate,
      });

      const listResponse = await apiClient.get(
        `${CHANGE_HISTORY_URL}?rule_id=${encodeURIComponent(created.id)}`,
        { headers: readerHeaders }
      );

      expect(listResponse).toHaveStatusCode(200);

      const list: ListRuleChangeHistoryResponse = listResponse.body;
      const createItem = list.items.find(
        ({ action }) => action === RuleChangesHistoryAction.ruleCreate
      );

      expect(createItem).toBeDefined();

      const detailResponse = await apiClient.get(
        `${CHANGE_HISTORY_URL}/${encodeURIComponent(createItem?.id ?? '')}`,
        { headers: readerHeaders }
      );

      expect(detailResponse).toHaveStatusCode(200);

      const detail: RuleChangeHistoryDetail = detailResponse.body;

      expect(detail).toMatchObject({
        id: createItem?.id,
        action: RuleChangesHistoryAction.ruleCreate,
        version: 1,
      });
      expect(detail.is_current).toBeUndefined();
      expect(detail.snapshot).toMatchObject({
        id: created.id,
        metadata: expect.objectContaining({ name: 'change-history-http-detail-original' }),
      });
    }
  );

  apiTest(
    'restore: applies an earlier snapshot as a new version and keeps the current enabled state',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'change-history-http-restore-original' },
          schedule: { every: '1d' },
        })
      );

      await apiServices.alertingV2.ruleChangesHistory.waitForAtLeast(1, {
        ruleId: created.id,
        action: RuleChangesHistoryAction.ruleCreate,
      });

      await apiServices.alertingV2.rules.upsert(
        created.id,
        buildCreateRuleData({
          metadata: { name: 'change-history-http-restore-renamed' },
          schedule: { every: '1d' },
        })
      );
      const disabled = await apiServices.alertingV2.rules.disable(created.id);

      const listResponse = await apiClient.get(
        `${CHANGE_HISTORY_URL}?rule_id=${encodeURIComponent(created.id)}`,
        { headers: readerHeaders }
      );

      expect(listResponse).toHaveStatusCode(200);

      const list: ListRuleChangeHistoryResponse = listResponse.body;
      const createItem = list.items.find(
        ({ action }) => action === RuleChangesHistoryAction.ruleCreate
      );

      expect(createItem).toBeDefined();

      const restoreResponse = await apiClient.post(
        `${CHANGE_HISTORY_URL}/${encodeURIComponent(createItem?.id ?? '')}/_restore`,
        { headers: writerHeaders }
      );

      expect(restoreResponse).toHaveStatusCode(200);

      const restored: RuleResponse = restoreResponse.body;

      expect(restored).toMatchObject({
        id: created.id,
        version: disabled.version + 1,
        enabled: false,
        metadata: expect.objectContaining({ name: 'change-history-http-restore-original' }),
      });

      const fetched = await apiServices.alertingV2.rules.get(created.id);

      expect(fetched).toStrictEqual(restored);

      await apiServices.alertingV2.ruleChangesHistory.waitForAtLeast(2, {
        ruleId: created.id,
        action: RuleChangesHistoryAction.ruleUpdate,
      });
    }
  );

  apiTest(
    'restore: rejects stale expected_version, read-only callers and unknown changes',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'change-history-http-restore-guards' },
          schedule: { every: '1d' },
        })
      );

      await apiServices.alertingV2.ruleChangesHistory.waitForAtLeast(1, {
        ruleId: created.id,
        action: RuleChangesHistoryAction.ruleCreate,
      });

      const listResponse = await apiClient.get(
        `${CHANGE_HISTORY_URL}?rule_id=${encodeURIComponent(created.id)}`,
        { headers: readerHeaders }
      );

      expect(listResponse).toHaveStatusCode(200);

      const list: ListRuleChangeHistoryResponse = listResponse.body;
      const restoreUrl = `${CHANGE_HISTORY_URL}/${encodeURIComponent(list.items[0].id)}/_restore`;

      const staleResponse = await apiClient.post(restoreUrl, {
        headers: writerHeaders,
        body: { expected_version: created.version + 1 },
      });

      expect(staleResponse).toHaveStatusCode(409);
      expect(staleResponse.body).toMatchObject({ code: 'RULE_VERSION_CONFLICT' });

      const readerResponse = await apiClient.post(restoreUrl, {
        headers: readerHeaders,
        body: { expected_version: created.version },
      });

      expect(readerResponse).toHaveStatusCode(403);

      const missingResponse = await apiClient.post(
        `${CHANGE_HISTORY_URL}/missing-change/_restore`,
        { headers: writerHeaders }
      );

      expect(missingResponse).toHaveStatusCode(404);
      expect(missingResponse.body).toMatchObject({ code: 'RULE_CHANGE_NOT_FOUND' });

      const unchanged = await apiServices.alertingV2.rules.get(created.id);

      expect(unchanged.version).toBe(created.version);
    }
  );
});
