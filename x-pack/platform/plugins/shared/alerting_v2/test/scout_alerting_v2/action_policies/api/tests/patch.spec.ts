/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * We are excluding the  @kbn/eslint/scout_require_api_client_in_api_test
 * eslint rule for this file because we do not test APIs but the how the data are persisted on disk.
 */

/* eslint-disable @kbn/eslint/scout_require_api_client_in_api_test */

import { omit } from 'lodash';
import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import {
  ALERTING_V2_ACTION_POLICIES_ALL_AND_RULES_READ_ROLE,
  apiTest,
  buildCreateActionPolicyData,
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
 * A policy stores a cleared field as an explicit `null` and the response projection turns those
 * sentinels back into absent keys, so "cleared on disk" and "never set" are indistinguishable over
 * HTTP.
 */
apiTest.describe('Patch action policy saved object', { tag: '@local-stateful-classic' }, () => {
  apiTest.afterEach(async ({ apiServices }) => {
    await apiServices.alertingV2.actionPolicies.cleanUp();
  });

  apiTest(
    'clears a field by storing null, keeping the key the response drops',
    async ({ apiServices }) => {
      const { actionPolicies, actionPolicySavedObject } = apiServices.alertingV2;
      const created = await actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'patch-clear',
          matcher: { tags: ['prod'] },
          group_by: ['service.name'],
          grouping_mode: 'per_field',
          throttle: { strategy: 'time_interval', interval: '5m' },
        })
      );

      const before = await actionPolicySavedObject.getAttributes(created.id);

      await actionPolicies.patch(created.id, {
        matcher: null,
        group_by: null,
        grouping_mode: null,
        throttle: null,
      });

      const after = await actionPolicySavedObject.getAttributes(created.id);

      expect(omit(after, VOLATILE_FIELDS)).toStrictEqual({
        ...omit(before, VOLATILE_FIELDS),
        matcher: null,
        groupBy: null,
        groupingMode: null,
        throttle: null,
      });

      expect(after.updatedAt).not.toBe(before.updatedAt);

      const projected = await actionPolicies.get(created.id);
      expect(projected.matcher).toBeUndefined();
      expect(projected.group_by).toBeUndefined();
      expect(projected.grouping_mode).toBeUndefined();
      expect(projected.throttle).toBeUndefined();
    }
  );

  apiTest('leaves every field the body omits unchanged on disk', async ({ apiServices }) => {
    const { actionPolicies, actionPolicySavedObject } = apiServices.alertingV2;
    const created = await actionPolicies.create(
      buildCreateActionPolicyData({
        name: 'patch-preserve',
        description: 'original description',
        destinations: [{ type: 'workflow', id: 'wf-1' }],
        matcher: { tags: ['prod'], expression: 'severity == "high"' },
        group_by: ['service.name'],
        grouping_mode: 'per_field',
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

  apiTest(
    'clears a matcher leaf by removing it from the stored object',
    async ({ apiServices }) => {
      const { actionPolicies, actionPolicySavedObject } = apiServices.alertingV2;
      const created = await actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'patch-matcher-leaf',
          matcher: { tags: ['prod'], expression: 'severity == "high"' },
        })
      );

      await actionPolicies.patch(created.id, { matcher: { expression: null } });

      const after = await actionPolicySavedObject.getAttributes(created.id);
      // Clearing the matcher itself stores `null`, but clearing one of its leaves drops the key:
      // only the top-level fields are normalized to a sentinel on the way to disk.
      expect(after.matcher).toStrictEqual({ tags: ['prod'] });
    }
  );

  apiTest('drops a throttle interval the merged strategy does not use', async ({ apiServices }) => {
    const { actionPolicies, actionPolicySavedObject } = apiServices.alertingV2;
    const created = await actionPolicies.create(
      buildCreateActionPolicyData({
        name: 'patch-throttle',
        grouping_mode: 'per_alert',
        throttle: { strategy: 'per_status_interval', interval: '5m' },
      })
    );

    await actionPolicies.patch(created.id, { throttle: { strategy: 'on_status_change' } });

    const after = await actionPolicySavedObject.getAttributes(created.id);
    // Throttle leaves merge independently, so the stale interval survives the merge and is only
    // dropped on the way to disk. It must not linger for a reader of the raw document.
    expect(after.throttle).toStrictEqual({ strategy: 'on_status_change', interval: null });
  });

  apiTest('rotates the stored api key on every patch', async ({ apiServices }) => {
    const { actionPolicies, actionPolicySavedObject } = apiServices.alertingV2;
    const created = await actionPolicies.create(
      buildCreateActionPolicyData({ name: 'patch-api-key' })
    );

    const before = await actionPolicySavedObject.getAttributes(created.id);

    await actionPolicies.patch(created.id, { description: 'patched description' });

    const after = await actionPolicySavedObject.getAttributes(created.id);
    // The key is never returned over HTTP, so its rotation is only observable on disk.
    expect(after.apiKey).not.toBe(before.apiKey);
    expect(after.apiKeyOwner).toBe(before.apiKeyOwner);
    expect(after.apiKeyCreatedByUser).toBe(before.apiKeyCreatedByUser);
  });

  apiTest(
    'writes nothing when the merged policy is invalid',
    async ({ apiClient, apiServices, requestAuth }) => {
      const { actionPolicies, actionPolicySavedObject } = apiServices.alertingV2;
      const created = await actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'patch-invalid-merge',
          grouping_mode: 'per_alert',
          throttle: { strategy: 'on_status_change' },
        })
      );

      const before = await actionPolicySavedObject.getAttributes(created.id);

      // The rejection is the assertion here, so this one patch goes through `apiClient`: the
      // service throws on a non-2xx and would hide the status and error code.
      const credentials: RoleApiCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_ACTION_POLICIES_ALL_AND_RULES_READ_ROLE
      );
      // The body is valid on its own; only the merged policy is not, because `on_status_change` is
      // not an aggregate strategy.
      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader },
        body: { grouping_mode: 'all' },
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('INVALID_ACTION_POLICY_DATA');

      const after = await actionPolicySavedObject.getAttributes(created.id);
      // Down to the api key: a rejected patch rotates nothing and writes nothing.
      expect(after).toStrictEqual(before);
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
