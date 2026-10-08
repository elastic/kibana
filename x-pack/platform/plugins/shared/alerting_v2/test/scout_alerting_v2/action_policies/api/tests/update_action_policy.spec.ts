/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import { ID_MAX_LENGTH, MAX_NAME_LENGTH } from '@kbn/alerting-v2-schemas';
import {
  ALERTING_V2_ACTION_POLICIES_ALL_AND_RULES_READ_ROLE,
  ALERTING_V2_ACTION_POLICIES_ALL_ROLE,
  ALERTING_V2_ACTION_POLICIES_READ_ROLE,
  ALERTING_V2_RULES_READ_ROLE,
  apiTest,
  buildCreateActionPolicyData,
  getActionPolicyUrl,
  NO_ACCESS_ROLE,
  testData,
} from '../fixtures';

apiTest.describe('Update action policy API', { tag: '@local-stateful-classic' }, () => {
  let writerCredentials: RoleApiCredentials;
  let writerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    writerCredentials = await requestAuth.getApiKeyForCustomRole(
      ALERTING_V2_ACTION_POLICIES_ALL_AND_RULES_READ_ROLE
    );
    writerHeaders = { ...writerCredentials.apiKeyHeader };
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.actionPolicies.cleanUp();
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.actionPolicies.cleanUp();
  });

  apiTest('update: patches all mutable fields', async ({ apiClient, apiServices }) => {
    const created = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({
        name: 'original-policy',
        description: 'original-policy-description',
        destinations: [{ type: 'workflow', id: 'original-workflow-id' }],
        matcher: { expression: "env == 'production' && region == 'us-east-1'" },
        group_by: ['service.name'],
        throttle: { strategy: 'per_status_interval', interval: '1m' },
      })
    );

    const response = await apiClient.patch(getActionPolicyUrl(created.id), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: {
        name: 'updated-policy',
        description: 'updated-policy-description',
        destinations: [{ type: 'workflow', id: 'updated-workflow-id' }],
        matcher: { expression: "env == 'production' && region == 'us-west-2'" },
        group_by: ['service.name', 'environment'],
        throttle: { interval: '5m' },
      },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.id).toBe(created.id);
    expect(response.body.name).toBe('updated-policy');
    expect(response.body.description).toBe('updated-policy-description');
    expect(response.body.destinations).toStrictEqual([
      { type: 'workflow', id: 'updated-workflow-id' },
    ]);
    expect(response.body.matcher).toMatchObject({
      expression: "env == 'production' && region == 'us-west-2'",
    });
    expect(response.body.group_by).toStrictEqual(['service.name', 'environment']);
    expect(response.body.throttle).toStrictEqual({
      strategy: 'per_status_interval',
      interval: '5m',
    });
    expect(new Date(response.body.updated_at).toISOString()).toBe(response.body.updated_at);
    // API key ownership is server-side only and must never be exposed over the wire.
    expect(response.body.auth).toBeUndefined();
  });

  apiTest(
    'partial: updates only name and preserves other fields',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'original-policy',
          description: 'original-policy-description',
          destinations: [{ type: 'workflow', id: 'original-workflow-id' }],
          matcher: { expression: "env == 'production' && region == 'us-east-1'" },
          group_by: ['service.name'],
          throttle: { strategy: 'per_status_interval', interval: '1m' },
        })
      );

      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: { name: 'only-name-updated' },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.name).toBe('only-name-updated');
      expect(response.body.description).toBe('original-policy-description');
      expect(response.body.destinations).toStrictEqual([
        { type: 'workflow', id: 'original-workflow-id' },
      ]);
      expect(response.body.matcher).toMatchObject({
        expression: "env == 'production' && region == 'us-east-1'",
      });
      expect(response.body.group_by).toStrictEqual(['service.name']);
      expect(response.body.throttle).toStrictEqual({
        strategy: 'per_status_interval',
        interval: '1m',
      });
    }
  );

  apiTest(
    'partial: updates only description and preserves other fields',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'original-policy',
          description: 'original-policy-description',
          destinations: [{ type: 'workflow', id: 'original-workflow-id' }],
          matcher: { expression: "env == 'production'" },
          group_by: ['service.name'],
          throttle: { strategy: 'per_status_interval', interval: '1m' },
        })
      );

      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: { description: 'only-description-updated' },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.name).toBe('original-policy');
      expect(response.body.description).toBe('only-description-updated');
      expect(response.body.destinations).toStrictEqual([
        { type: 'workflow', id: 'original-workflow-id' },
      ]);
      expect(response.body.matcher).toMatchObject({ expression: "env == 'production'" });
      expect(response.body.group_by).toStrictEqual(['service.name']);
      expect(response.body.throttle).toStrictEqual({
        strategy: 'per_status_interval',
        interval: '1m',
      });
    }
  );

  apiTest(
    'partial: updates matcher/group_by/throttle and preserves name/description/destinations',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'original-policy',
          description: 'original-policy-description',
          destinations: [{ type: 'workflow', id: 'original-workflow-id' }],
          matcher: { expression: "env == 'production' && region == 'us-east-1'" },
          group_by: ['service.name'],
          throttle: { strategy: 'per_status_interval', interval: '1m' },
        })
      );

      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: {
          matcher: { expression: "env == 'staging' && region == 'eu-central-1'" },
          group_by: ['service.name', 'host.name'],
          throttle: { interval: '15m' },
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.name).toBe('original-policy');
      expect(response.body.description).toBe('original-policy-description');
      expect(response.body.destinations).toStrictEqual([
        { type: 'workflow', id: 'original-workflow-id' },
      ]);
      expect(response.body.matcher).toMatchObject({
        expression: "env == 'staging' && region == 'eu-central-1'",
      });
      expect(response.body.group_by).toStrictEqual(['service.name', 'host.name']);
      expect(response.body.throttle).toStrictEqual({
        strategy: 'per_status_interval',
        interval: '15m',
      });
    }
  );

  apiTest(
    'partial: updates only destinations and preserves other fields',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'dest-policy',
          description: 'dest-policy description',
          destinations: [{ type: 'workflow', id: 'original-dest-workflow' }],
          matcher: { expression: "env == 'staging'" },
          group_by: ['host.name'],
          throttle: { strategy: 'per_status_interval', interval: '2m' },
        })
      );

      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: {
          destinations: [{ type: 'workflow', id: 'updated-dest-workflow' }],
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.destinations).toStrictEqual([
        { type: 'workflow', id: 'updated-dest-workflow' },
      ]);
      expect(response.body.name).toBe('dest-policy');
      expect(response.body.description).toBe('dest-policy description');
      expect(response.body.matcher).toMatchObject({ expression: "env == 'staging'" });
      expect(response.body.group_by).toStrictEqual(['host.name']);
      expect(response.body.throttle).toStrictEqual({
        strategy: 'per_status_interval',
        interval: '2m',
      });
    }
  );

  apiTest(
    'partial: updates grouping_mode and throttle strategy together',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'mode-update-policy',
          description: 'will update grouping mode',
          destinations: [{ type: 'workflow', id: 'wf-1' }],
          grouping_mode: 'per_alert',
          throttle: { strategy: 'on_status_change' },
        })
      );

      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: {
          grouping_mode: 'all',
          throttle: { strategy: 'time_interval', interval: '10m' },
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.grouping_mode).toBe('all');
      expect(response.body.throttle).toStrictEqual({
        strategy: 'time_interval',
        interval: '10m',
      });
      expect(response.body.name).toBe('mode-update-policy');
    }
  );

  apiTest(
    'transition: clears throttle.interval when moving to an intervalless strategy',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'strategy-transition-policy',
          description: 'transitions from per_status_interval to on_status_change',
          destinations: [{ type: 'workflow', id: 'wf-1' }],
          grouping_mode: 'per_alert',
          throttle: { strategy: 'per_status_interval', interval: '10m' },
        })
      );

      const updated = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: {
          throttle: { strategy: 'on_status_change' },
        },
      });

      expect(updated).toHaveStatusCode(200);
      expect(updated.body.throttle).toStrictEqual({ strategy: 'on_status_change' });

      // Re-fetch via GET to confirm the persisted value matches the PATCH response.
      const fetched = await apiServices.alertingV2.actionPolicies.get(created.id);
      expect(fetched.throttle).toStrictEqual({ strategy: 'on_status_change' });
    }
  );

  apiTest(
    'nullable: clears grouping_mode/group_by/throttle when set to null',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'clear-mode-policy',
          description: 'will clear grouping mode',
          destinations: [{ type: 'workflow', id: 'wf-1' }],
          grouping_mode: 'per_field',
          group_by: ['host.name'],
          throttle: { strategy: 'time_interval', interval: '5m' },
        })
      );

      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: {
          grouping_mode: null,
          group_by: null,
          throttle: null,
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.grouping_mode).toBeUndefined();
      expect(response.body.group_by).toBeUndefined();
      expect(response.body.throttle).toBeUndefined();
    }
  );

  apiTest(
    'nullable: clears matcher/group_by/throttle when set to null',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'nullable-policy',
          description: 'nullable-policy description',
          destinations: [{ type: 'workflow', id: 'nullable-workflow-id' }],
          matcher: { expression: "env == 'production'" },
          group_by: ['service.name'],
          throttle: { strategy: 'per_status_interval', interval: '5m' },
        })
      );

      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: {
          matcher: null,
          group_by: null,
          throttle: null,
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.matcher).toBeUndefined();
      expect(response.body.group_by).toBeUndefined();
      expect(response.body.throttle).toBeUndefined();
      expect(response.body.name).toBe('nullable-policy');
      expect(response.body.destinations).toStrictEqual([
        { type: 'workflow', id: 'nullable-workflow-id' },
      ]);
    }
  );

  apiTest(
    'merge: patches one matcher leaf and preserves its sibling',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'matcher-leaf-policy',
          matcher: { tags: ['production'], expression: "data.severity == 'critical'" },
        })
      );

      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: { matcher: { tags: ['staging'] } },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.matcher).toStrictEqual({
        tags: ['staging'],
        expression: "data.severity == 'critical'",
      });

      const fetched = await apiServices.alertingV2.actionPolicies.get(created.id);
      expect(fetched.matcher).toStrictEqual(response.body.matcher);
    }
  );

  apiTest(
    'merge: an empty matcher names no leaf, so it changes nothing',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'empty-matcher-noop-policy',
          matcher: { tags: ['production'], expression: "data.severity == 'critical'" },
        })
      );

      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: { matcher: {} },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.matcher).toStrictEqual({
        tags: ['production'],
        expression: "data.severity == 'critical'",
      });

      const fetched = await apiServices.alertingV2.actionPolicies.get(created.id);
      expect(fetched.matcher).toStrictEqual(response.body.matcher);
    }
  );

  apiTest('merge: an empty body names no field, so nothing changes', async ({ apiClient }) => {
    const created = await apiClient.post(testData.ACTION_POLICY_API_PATH, {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: buildCreateActionPolicyData({
        name: 'empty-body-noop-policy',
        description: 'untouched',
        matcher: { tags: ['production'], expression: "data.severity == 'critical'" },
        group_by: ['service.name'],
        grouping_mode: 'per_field',
        throttle: { strategy: 'time_interval', interval: '5m' },
      }),
    });
    expect(created).toHaveStatusCode(201);

    const response = await apiClient.patch(getActionPolicyUrl(created.body.id), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: {},
    });

    expect(response).toHaveStatusCode(200);
    expect(omit(response.body, 'updated_at')).toStrictEqual(omit(created.body, 'updated_at'));
  });

  apiTest(
    'merge: clears one matcher leaf with null and preserves its sibling',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'matcher-leaf-clear-policy',
          matcher: { tags: ['production'], expression: "data.severity == 'critical'" },
        })
      );

      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: { matcher: { expression: null } },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.matcher).toStrictEqual({ tags: ['production'] });

      const fetched = await apiServices.alertingV2.actionPolicies.get(created.id);
      expect(fetched.matcher).toStrictEqual({ tags: ['production'] });
    }
  );

  apiTest(
    'merge: clears the whole matcher with a top-level null even when both leaves are set',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'matcher-object-clear-policy',
          matcher: { tags: ['production'], expression: "data.severity == 'critical'" },
        })
      );

      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: { matcher: null },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.matcher).toBeUndefined();

      const fetched = await apiServices.alertingV2.actionPolicies.get(created.id);
      expect(fetched.matcher).toBeUndefined();
    }
  );

  apiTest(
    'merge: patches throttle.interval and preserves throttle.strategy',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'throttle-leaf-policy',
          grouping_mode: 'per_alert',
          throttle: { strategy: 'per_status_interval', interval: '5m' },
        })
      );

      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: { throttle: { interval: '30m' } },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.throttle).toStrictEqual({
        strategy: 'per_status_interval',
        interval: '30m',
      });
    }
  );

  apiTest(
    'merge: replaces group_by and destinations wholesale rather than merging',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'list-replace-policy',
          destinations: [
            { type: 'workflow', id: 'workflow-a' },
            { type: 'workflow', id: 'workflow-b' },
          ],
          grouping_mode: 'per_field',
          group_by: ['service.name', 'host.name'],
        })
      );

      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: {
          destinations: [{ type: 'workflow', id: 'workflow-c' }],
          group_by: ['host.name'],
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.destinations).toStrictEqual([{ type: 'workflow', id: 'workflow-c' }]);
      expect(response.body.group_by).toStrictEqual(['host.name']);
    }
  );

  apiTest(
    'merge: rejects an unknown key nested inside matcher',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'nested-strict-policy' })
      );

      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: { matcher: { unknown: ['production'] } },
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );

  apiTest(
    'merge: rejects a patch whose merged document is invalid and stores nothing',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'invalid-merge-policy',
          grouping_mode: 'per_alert',
          throttle: { strategy: 'on_status_change' },
        })
      );

      // The body is valid on its own; only the merged policy is not, because
      // `on_status_change` is a per-alert strategy. The whole patch has to fail.
      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: { grouping_mode: 'all' },
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('INVALID_ACTION_POLICY_DATA');

      const fetched = await apiServices.alertingV2.actionPolicies.get(created.id);
      expect(fetched.grouping_mode).toBe('per_alert');
      expect(fetched.throttle).toStrictEqual({ strategy: 'on_status_change' });
    }
  );

  apiTest(
    'round trip: the patch response matches a subsequent GET',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'round-trip-policy',
          matcher: { tags: ['production'], expression: "data.severity == 'critical'" },
          grouping_mode: 'per_field',
          group_by: ['service.name'],
          throttle: { strategy: 'time_interval', interval: '5m' },
        })
      );

      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: { matcher: { expression: null }, throttle: { interval: '15m' } },
      });

      expect(response).toHaveStatusCode(200);

      const fetched = await apiServices.alertingV2.actionPolicies.get(created.id);
      expect(response.body).toStrictEqual(fetched);
    }
  );

  apiTest('not found: returns 404 for a non-existent id', async ({ apiClient }) => {
    const response = await apiClient.patch(getActionPolicyUrl('non-existent-id'), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: {
        name: 'some-name',
        description: 'some-description',
        destinations: [{ type: 'workflow', id: 'some-workflow-id' }],
      },
    });

    expect(response).toHaveStatusCode(404);
    expect(response.body.code).toBe('ACTION_POLICY_NOT_FOUND');
  });

  apiTest('validation: rejects empty destinations array', async ({ apiClient, apiServices }) => {
    const created = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'empty-dest-policy' })
    );

    const response = await apiClient.patch(getActionPolicyUrl(created.id), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: { destinations: [] },
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest(
    'validation: rejects empty name (when name is provided)',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'empty-name-policy' })
      );

      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: { name: '' },
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );

  apiTest(
    'validation: rejects name over the maximum length',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'long-name-policy' })
      );

      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: {
          name: 'a'.repeat(MAX_NAME_LENGTH + 1),
        },
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );

  apiTest(
    'validation: rejects unknown extra field (.strict() schema)',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'extra-field-policy' })
      );

      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: { foo: 'bar' },
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );

  apiTest(
    'validation: rejects the empty collections that would otherwise reach storage',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'empty-sentinels-policy',
          group_by: ['service.name'],
          grouping_mode: 'per_field',
          throttle: { strategy: 'time_interval', interval: '5m' },
        })
      );

      const patch = (body: Record<string, unknown>) =>
        apiClient.patch(getActionPolicyUrl(created.id), {
          headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
          body,
        });

      // An empty array used to reach the saved object schema's `minSize: 1` and surface as a 500.
      const emptyGroupBy = await patch({ group_by: [] });
      expect(emptyGroupBy).toHaveStatusCode(400);
      expect(emptyGroupBy.body.code).toBe('BAD_REQUEST');

      // A throttle is cleared whole, with `throttle: null`, never by nulling its strategy.
      const nulledStrategy = await patch({ throttle: { strategy: null } });
      expect(nulledStrategy).toHaveStatusCode(400);
      expect(nulledStrategy.body.code).toBe('BAD_REQUEST');
    }
  );

  apiTest('validation: rejects id over the maximum length', async ({ apiClient }) => {
    const response = await apiClient.patch(getActionPolicyUrl('a'.repeat(ID_MAX_LENGTH + 1)), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: {
        name: 'too-long-id-update',
      },
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest(
    'authorization: 200 with full alerting_v2 privileges (write)',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'writer-can-patch' })
      );

      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: { name: 'writer-can-patch-updated' },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.name).toBe('writer-can-patch-updated');
    }
  );

  apiTest(
    'authorization: 403 with read-only action policy alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_ACTION_POLICIES_READ_ROLE
      );
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'reader-cannot-patch' })
      );

      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
        body: { name: 'reader-cannot-patch-updated' },
      });

      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest(
    'authorization: 403 without alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'no-access-cannot-patch' })
      );

      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
        body: { name: 'no-access-cannot-patch-updated' },
      });

      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest(
    'authorization: 403 with action policies write but without rules read',
    async ({ apiClient, apiServices, requestAuth }) => {
      const actionPoliciesOnlyCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_ACTION_POLICIES_ALL_ROLE
      );
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'action-policies-only-cannot-patch' })
      );

      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...actionPoliciesOnlyCredentials.apiKeyHeader },
        body: { name: 'action-policies-only-cannot-patch-updated' },
      });

      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest(
    'authorization: 403 with rules read but no action policies write permissions',
    async ({ apiClient, apiServices, requestAuth }) => {
      const rulesOnlyCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_RULES_READ_ROLE
      );
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'action-policies-only-cannot-patch' })
      );

      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...rulesOnlyCredentials.apiKeyHeader },
        body: { name: 'rules-only-cannot-patch-updated' },
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
