/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @kbn/eslint/scout_require_api_client_in_api_test */

import { omit } from 'lodash';
import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import {
  ALERTING_V2_ACTION_POLICIES_ALL_AND_RULES_READ_ROLE,
  apiTest,
  buildCreateActionPolicyData,
  findNullPaths,
  getActionPolicyUrl,
  testData,
} from '../fixtures';

/**
 * `apiKey` is rotated on every successful patch and `updatedAt` is refreshed, so both are asserted
 * on their own rather than through a whole-document comparison.
 */
const VOLATILE_FIELDS = ['apiKey', 'updatedAt'];

/**
 * Asserts what a PATCH persisted, rather than what it returned.
 *
 * A policy clears a field by removing its key, the same convention rules follow, and the response
 * projection reads a `null` and an absent key identically. A GET therefore cannot tell you which
 * one is on disk, which is why these assertions go through the saved object.
 *
 * The writes go through `apiServices`, which keeps the stored audit actors identical before and
 * after so a whole-document comparison stays meaningful. Authorization of the same endpoint is
 * covered by `update_action_policy.spec.ts`.
 */
apiTest.describe('Patch action policy saved object', { tag: '@local-stateful-classic' }, () => {
  apiTest.afterEach(async ({ apiServices }) => {
    await apiServices.alertingV2.actionPolicies.cleanUp();
  });

  apiTest('clears a field by removing its key, never by storing null', async ({ apiServices }) => {
    const { actionPolicies, actionPolicySavedObject } = apiServices.alertingV2;
    const created = await actionPolicies.create(
      buildCreateActionPolicyData({
        name: 'patch-clear',
        matcher: { tags: ['prod'] },
        grouping: { mode: 'per_field', fields: ['service.name'] },
        throttle: { strategy: 'time_interval', interval: '5m' },
      })
    );

    const before = await actionPolicySavedObject.getAttributes(created.id);

    await actionPolicies.patch(created.id, {
      matcher: null,
      grouping: null,
      throttle: null,
    });

    const after = await actionPolicySavedObject.getAttributes(created.id);
    expect(omit(after, VOLATILE_FIELDS)).toStrictEqual(
      omit(before, [...VOLATILE_FIELDS, 'matcher', 'grouping', 'throttle'])
    );
    expect(findNullPaths(after)).toStrictEqual([]);
    expect(after.updatedAt).not.toBe(before.updatedAt);
  });

  apiTest('leaves every field the body omits unchanged on disk', async ({ apiServices }) => {
    const { actionPolicies, actionPolicySavedObject } = apiServices.alertingV2;
    const created = await actionPolicies.create(
      buildCreateActionPolicyData({
        name: 'patch-preserve',
        description: 'original description',
        destinations: [{ type: 'workflow', id: 'wf-1' }],
        matcher: { tags: ['prod'], expression: 'severity == "high"' },
        grouping: { mode: 'per_field', fields: ['service.name'] },
        throttle: { strategy: 'time_interval', interval: '5m' },
      })
    );

    const before = await actionPolicySavedObject.getAttributes(created.id);

    await actionPolicies.patch(created.id, { description: 'patched description' });

    const after = await actionPolicySavedObject.getAttributes(created.id);
    expect(omit(after, VOLATILE_FIELDS)).toStrictEqual({
      ...omit(before, VOLATILE_FIELDS),
      description: 'patched description',
    });
    expect(after.updatedAt).not.toBe(before.updatedAt);
  });

  apiTest('clears a nested leaf without disturbing its siblings', async ({ apiServices }) => {
    const { actionPolicies, actionPolicySavedObject } = apiServices.alertingV2;
    const created = await actionPolicies.create(
      buildCreateActionPolicyData({
        name: 'patch-matcher-leaf',
        matcher: { tags: ['prod'], expression: 'severity == "high"' },
      })
    );

    await actionPolicies.patch(created.id, { matcher: { expression: null } });

    const after = await actionPolicySavedObject.getAttributes(created.id);
    expect(after.matcher).toStrictEqual({ tags: ['prod'] });
    expect(findNullPaths(after)).toStrictEqual([]);
  });

  apiTest('drops a throttle interval the merged strategy does not use', async ({ apiServices }) => {
    const { actionPolicies, actionPolicySavedObject } = apiServices.alertingV2;
    const created = await actionPolicies.create(
      buildCreateActionPolicyData({
        name: 'patch-throttle',
        grouping: { mode: 'per_alert' },
        throttle: { strategy: 'per_status_interval', interval: '5m' },
      })
    );

    await actionPolicies.patch(created.id, { throttle: { strategy: 'on_status_change' } });

    const after = await actionPolicySavedObject.getAttributes(created.id);
    // The strategy decides the rest of the block, so a patch replaces it whole. The interval the
    // previous strategy used must not linger for a reader of the raw document.
    expect(after.throttle).toStrictEqual({ strategy: 'on_status_change' });
  });

  apiTest('clears the description by removing its key', async ({ apiServices }) => {
    const { actionPolicies, actionPolicySavedObject } = apiServices.alertingV2;
    const created = await actionPolicies.create(
      buildCreateActionPolicyData({ name: 'patch-clear-description', description: 'original' })
    );

    await actionPolicies.patch(created.id, { description: null });

    const after = await actionPolicySavedObject.getAttributes(created.id);
    expect(Object.keys(after)).not.toContain('description');
    expect(findNullPaths(after)).toStrictEqual([]);

    const fetched = await actionPolicies.get(created.id);
    expect(Object.keys(fetched)).not.toContain('description');
  });

  apiTest(
    'rejects an empty union patch and leaves the stored block alone',
    async ({ apiClient, apiServices, requestAuth }) => {
      const { actionPolicies, actionPolicySavedObject } = apiServices.alertingV2;
      const created = await actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'patch-union-empty',
          grouping: { mode: 'all' },
          throttle: { strategy: 'time_interval', interval: '5m' },
        })
      );

      // `{}` is not a variant the typed client can express, so these bodies go over the wire raw.
      const credentials: RoleApiCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_ACTION_POLICIES_ALL_AND_RULES_READ_ROLE
      );
      // A matcher patch names leaves, so `{}` there names none of them. A throttle and a grouping
      // are replaced whole, so `{}` is a block naming no variant rather than an empty selection.
      for (const body of [{ throttle: {} }, { grouping: {} }]) {
        const response = await apiClient.patch(getActionPolicyUrl(created.id), {
          headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader },
          body,
        });

        expect(response).toHaveStatusCode(400);
        expect(response.body.code).toBe('BAD_REQUEST');
      }

      const after = await actionPolicySavedObject.getAttributes(created.id);
      expect(after.throttle).toStrictEqual({ strategy: 'time_interval', interval: '5m' });
      expect(after.grouping).toStrictEqual({ mode: 'all' });
    }
  );

  apiTest(
    'clears the matcher when its last leaf goes, leaving a catch-all policy',
    async ({ apiClient, apiServices, requestAuth }) => {
      const { actionPolicies, actionPolicySavedObject } = apiServices.alertingV2;
      const created = await actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'patch-matcher-last-leaf',
          matcher: { tags: ['prod'] },
        })
      );

      await actionPolicies.patch(created.id, { matcher: { tags: null } });

      // `{}` is not a matcher any write accepts, so the merge clears the block with its last leaf.
      const after = await actionPolicySavedObject.getAttributes(created.id);
      expect(Object.keys(after)).not.toContain('matcher');
      expect(findNullPaths(after)).toStrictEqual([]);

      const fetched = await actionPolicies.get(created.id);
      expect(Object.keys(fetched)).not.toContain('matcher');

      // Absent is not just tidy on disk: the policy now applies to a rule with no routing tags.
      const credentials: RoleApiCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_ACTION_POLICIES_ALL_AND_RULES_READ_ROLE
      );
      const matched = await apiClient.post(testData.INTERNAL_ACTION_POLICY_MATCH_API_PATH, {
        headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader },
        body: { rule: {} },
      });

      expect(matched).toHaveStatusCode(200);
      expect(
        matched.body.items.find(
          (item: { action_policy: { id: string }; category: string }) =>
            item.action_policy.id === created.id
        )?.category
      ).toBe('catch_all');
    }
  );

  apiTest('never writes enabled or the snooze state', async ({ apiServices }) => {
    const { actionPolicies, actionPolicySavedObject } = apiServices.alertingV2;
    const created = await actionPolicies.create(
      buildCreateActionPolicyData({ name: 'patch-server-owned' })
    );

    await actionPolicies.disable(created.id);
    const snoozedUntil = new Date(Date.now() + 86_400_000).toISOString();
    await actionPolicies.snooze(created.id, snoozedUntil);

    await actionPolicies.patch(created.id, { description: 'patched description' });

    const after = await actionPolicySavedObject.getAttributes(created.id);
    expect(after.description).toBe('patched description');
    expect(after.enabled).toBe(false);
    expect(after.snoozedUntil).toBe(snoozedUntil);
  });
});
