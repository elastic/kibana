/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import type {
  ListRuleChangeHistoryResponse,
  RuleChangeHistoryDetail,
} from '@kbn/alerting-v2-schemas';
import { RuleChangesHistoryAction } from '../../../../../server/lib/rule_changes_history/audit_actions';
import { ALERTING_V2_RULES_READ_ROLE, apiTest, buildCreateRuleData, testData } from '../fixtures';

const CHANGE_HISTORY_URL = testData.INTERNAL_CHANGE_HISTORY_RULES_API_PATH;

apiTest.describe('Rule change history API', { tag: tags.stateful.classic }, () => {
  let readerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ apiServices, requestAuth }) => {
    await apiServices.alertingV2.rules.cleanUp();

    const readerCredentials: RoleApiCredentials = await requestAuth.getApiKeyForCustomRole(
      ALERTING_V2_RULES_READ_ROLE
    );
    readerHeaders = { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader };
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
});
