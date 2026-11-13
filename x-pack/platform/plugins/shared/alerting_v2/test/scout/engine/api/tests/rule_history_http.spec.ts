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
const OTHER_SPACE_ID = 'rule-history-restore-other-space';
const inOtherSpace = (path: string): string => `/s/${OTHER_SPACE_ID}${path}`;

apiTest.describe('Rule change history API', { tag: testData.API_ENGINE_NON_MKI_TAG }, () => {
  let readerHeaders: Record<string, string>;
  let writerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ apiServices, requestAuth }) => {
    await apiServices.alertingV2.rules.cleanUp();
    await apiServices.spaces.delete(OTHER_SPACE_ID);
    await apiServices.spaces.create({ id: OTHER_SPACE_ID, name: OTHER_SPACE_ID });

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
    await apiServices.spaces.delete(OTHER_SPACE_ID);
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

      // The restore's history entry is written asynchronously after the response.
      const listHistory = async (): Promise<ListRuleChangeHistoryResponse> => {
        const response = await apiClient.get(
          `${CHANGE_HISTORY_URL}?rule_id=${encodeURIComponent(created.id)}`,
          { headers: readerHeaders }
        );
        expect(response).toHaveStatusCode(200);
        return response.body;
      };

      await expect.poll(async () => (await listHistory()).items[0]?.version).toBe(restored.version);

      const afterRestore = await listHistory();

      expect(afterRestore.items[0]).toMatchObject({
        action: RuleChangesHistoryAction.ruleUpdate,
        version: restored.version,
        is_current: true,
      });

      // A later change's entry is written after any subscriber work queued by the restore.
      await apiServices.alertingV2.rules.enable(created.id);
      await apiServices.alertingV2.ruleChangesHistory.waitForAtLeast(1, {
        ruleId: created.id,
        action: RuleChangesHistoryAction.ruleEnable,
      });

      const finalHistoryResponse = await apiClient.get(
        `${CHANGE_HISTORY_URL}?rule_id=${encodeURIComponent(created.id)}`,
        { headers: readerHeaders }
      );
      const finalHistory: ListRuleChangeHistoryResponse = finalHistoryResponse.body;

      expect(finalHistory.items.filter(({ version }) => version === restored.version)).toHaveLength(
        1
      );
    }
  );

  apiTest(
    'restore: rejects read-only callers and unknown changes',
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

      const readerResponse = await apiClient.post(restoreUrl, { headers: readerHeaders });

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

  apiTest(
    'restore: does not apply a change recorded in another space',
    async ({ apiClient, apiServices }) => {
      const otherSpaceRule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'change-history-http-restore-other-space-original' },
          schedule: { every: '1d' },
        }),
        { spaceId: OTHER_SPACE_ID }
      );

      await apiServices.alertingV2.ruleChangesHistory.waitForAtLeast(1, {
        ruleId: otherSpaceRule.id,
        action: RuleChangesHistoryAction.ruleCreate,
        spaceId: OTHER_SPACE_ID,
      });

      const otherSpaceRuleUrl = inOtherSpace(
        `${testData.RULE_API_PATH}/${encodeURIComponent(otherSpaceRule.id)}`
      );
      const renamedResponse = await apiClient.put(otherSpaceRuleUrl, {
        headers: writerHeaders,
        body: buildCreateRuleData({
          metadata: { name: 'change-history-http-restore-other-space-renamed' },
          schedule: { every: '1d' },
        }),
      });

      expect(renamedResponse).toHaveStatusCode(200);

      const renamed: RuleResponse = renamedResponse.body;

      const otherSpaceListResponse = await apiClient.get(
        inOtherSpace(`${CHANGE_HISTORY_URL}?rule_id=${encodeURIComponent(otherSpaceRule.id)}`),
        { headers: readerHeaders }
      );

      expect(otherSpaceListResponse).toHaveStatusCode(200);

      const otherSpaceList: ListRuleChangeHistoryResponse = otherSpaceListResponse.body;
      const otherSpaceCreateItem = otherSpaceList.items.find(
        ({ action }) => action === RuleChangesHistoryAction.ruleCreate
      );

      expect(otherSpaceCreateItem).toBeDefined();

      const restorePath = `${CHANGE_HISTORY_URL}/${encodeURIComponent(
        otherSpaceCreateItem?.id ?? ''
      )}/_restore`;

      const crossSpaceResponse = await apiClient.post(restorePath, { headers: writerHeaders });

      expect(crossSpaceResponse).toHaveStatusCode(404);
      expect(crossSpaceResponse.body).toMatchObject({ code: 'RULE_CHANGE_NOT_FOUND' });

      const otherSpaceRuleAfterResponse = await apiClient.get(otherSpaceRuleUrl, {
        headers: readerHeaders,
      });

      expect(otherSpaceRuleAfterResponse).toHaveStatusCode(200);
      expect(otherSpaceRuleAfterResponse.body).toStrictEqual(renamed);

      // The same change restores from its own space, so the 404 above comes from space scoping.
      const sameSpaceResponse = await apiClient.post(inOtherSpace(restorePath), {
        headers: writerHeaders,
      });

      expect(sameSpaceResponse).toHaveStatusCode(200);
      expect(sameSpaceResponse.body).toMatchObject({
        id: otherSpaceRule.id,
        version: renamed.version + 1,
        metadata: expect.objectContaining({
          name: 'change-history-http-restore-other-space-original',
        }),
      });
    }
  );
});
