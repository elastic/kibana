/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import type { ListRuleChangeHistoryResponse, RuleResponse } from '@kbn/alerting-v2-schemas';
import { RuleChangesHistoryAction } from '../../../../../server/lib/rule_changes_history/audit_actions';
import {
  ALERTING_V2_RULES_ALL_ROLE,
  ALERTING_V2_RULES_READ_ROLE,
  apiTest,
  buildCreateRuleData,
  testData,
} from '../fixtures';

const CHANGE_HISTORY_URL = testData.INTERNAL_CHANGE_HISTORY_RULES_API_PATH;
const OTHER_SPACE_ID = 'restore-rule-other-space';
const inOtherSpace = (path: string): string => `/s/${OTHER_SPACE_ID}${path}`;

apiTest.describe('Restore rule API', { tag: testData.API_ENGINE_NON_MKI_TAG }, () => {
  let readerHeaders: Record<string, string>;
  let writerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ apiServices, requestAuth }) => {
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

  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
    await apiServices.spaces.delete(OTHER_SPACE_ID);
  });

  apiTest(
    'restore: applies an earlier snapshot, including its enabled state, as a new version',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'restore-rule-original' },
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
          metadata: { name: 'restore-rule-renamed' },
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
        enabled: true,
        metadata: expect.objectContaining({ name: 'restore-rule-original' }),
      });

      const fetched = await apiServices.alertingV2.rules.get(created.id);

      expect(fetched).toStrictEqual(restored);

      /*
       * The restore's history entry is written asynchronously after the response. The upsert and
       * the restore are the rule's only update entries.
       */
      await apiServices.alertingV2.ruleChangesHistory.waitForAtLeast(2, {
        ruleId: created.id,
        action: RuleChangesHistoryAction.ruleUpdate,
      });

      const afterRestoreResponse = await apiClient.get(
        `${CHANGE_HISTORY_URL}?rule_id=${encodeURIComponent(created.id)}`,
        { headers: readerHeaders }
      );

      expect(afterRestoreResponse).toHaveStatusCode(200);

      const afterRestore: ListRuleChangeHistoryResponse = afterRestoreResponse.body;

      expect(afterRestore.items[0]).toMatchObject({
        action: RuleChangesHistoryAction.ruleUpdate,
        version: restored.version,
        is_current: true,
      });
    }
  );

  apiTest(
    'restore: brings a builder rule back in builder mode',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'restore-builder-rule', builder: { type: 'threshold' } },
        })
      );

      await apiServices.alertingV2.ruleChangesHistory.waitForAtLeast(1, {
        ruleId: created.id,
        action: RuleChangesHistoryAction.ruleCreate,
      });

      const cleared = await apiServices.alertingV2.rules.upsert(
        created.id,
        buildCreateRuleData({ metadata: { name: 'restore-builder-rule' } })
      );
      expect(cleared.metadata.builder).toBeUndefined();

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
      expect(restoreResponse.body.metadata.builder).toStrictEqual({ type: 'threshold' });
    }
  );

  apiTest('restore: rejects read-only callers and unknown changes', async ({ apiClient }) => {
    const restoreUrl = `${CHANGE_HISTORY_URL}/missing-change/_restore`;

    const readerResponse = await apiClient.post(restoreUrl, { headers: readerHeaders });

    expect(readerResponse).toHaveStatusCode(403);

    const missingResponse = await apiClient.post(restoreUrl, { headers: writerHeaders });

    expect(missingResponse).toHaveStatusCode(404);
    expect(missingResponse.body).toMatchObject({ code: 'RULE_CHANGE_NOT_FOUND' });
  });

  apiTest(
    'restore: does not apply a change recorded in another space',
    async ({ apiClient, apiServices }) => {
      const otherSpaceRule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'restore-rule-other-space-original' },
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
          metadata: { name: 'restore-rule-other-space-renamed' },
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
          name: 'restore-rule-other-space-original',
        }),
      });
    }
  );
});
