/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import { VERSION_MAX_LENGTH, ID_MAX_LENGTH, MAX_NAME_LENGTH } from '@kbn/alerting-v2-schemas';
import {
  ALERTING_V2_ACTION_POLICIES_ALL_ROLE,
  ALERTING_V2_ACTION_POLICIES_READ_ROLE,
  apiTest,
  buildCreateActionPolicyData,
  getActionPolicyUrl,
  NO_ACCESS_ROLE,
  testData,
} from '../../../fixtures';

apiTest.describe('Update action policy API', { tag: '@local-stateful-classic' }, () => {
  let writerCredentials: RoleApiCredentials;
  let writerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    writerCredentials = await requestAuth.getApiKeyForCustomRole(
      ALERTING_V2_ACTION_POLICIES_ALL_ROLE
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
        matcher: "env == 'production' && region == 'us-east-1'",
        groupBy: ['service.name'],
        throttle: { interval: '1m' },
      })
    );

    const response = await apiClient.patch(getActionPolicyUrl(created.id), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: {
        name: 'updated-policy',
        description: 'updated-policy-description',
        destinations: [{ type: 'workflow', id: 'updated-workflow-id' }],
        matcher: "env == 'production' && region == 'us-west-2'",
        groupBy: ['service.name', 'environment'],
        throttle: { interval: '5m' },
        version: created.version,
      },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.id).toBe(created.id);
    expect(typeof response.body.version).toBe('string');
    expect(response.body.name).toBe('updated-policy');
    expect(response.body.description).toBe('updated-policy-description');
    expect(response.body.destinations).toStrictEqual([
      { type: 'workflow', id: 'updated-workflow-id' },
    ]);
    expect(response.body.matcher).toBe("env == 'production' && region == 'us-west-2'");
    expect(response.body.groupBy).toStrictEqual(['service.name', 'environment']);
    expect(response.body.throttle).toStrictEqual({ interval: '5m' });
    expect(new Date(response.body.updatedAt).toISOString()).toBe(response.body.updatedAt);
    // The API key is server-side only and must never be exposed over the wire.
    expect(response.body.auth.apiKey).toBeUndefined();
  });

  apiTest(
    'partial: updates only name and preserves other fields',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'original-policy',
          description: 'original-policy-description',
          destinations: [{ type: 'workflow', id: 'original-workflow-id' }],
          matcher: "env == 'production' && region == 'us-east-1'",
          groupBy: ['service.name'],
          throttle: { interval: '1m' },
        })
      );

      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: { name: 'only-name-updated', version: created.version },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.name).toBe('only-name-updated');
      expect(response.body.description).toBe('original-policy-description');
      expect(response.body.destinations).toStrictEqual([
        { type: 'workflow', id: 'original-workflow-id' },
      ]);
      expect(response.body.matcher).toBe("env == 'production' && region == 'us-east-1'");
      expect(response.body.groupBy).toStrictEqual(['service.name']);
      expect(response.body.throttle).toStrictEqual({ interval: '1m' });
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
          matcher: "env == 'production'",
          groupBy: ['service.name'],
          throttle: { interval: '1m' },
        })
      );

      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: { description: 'only-description-updated', version: created.version },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.name).toBe('original-policy');
      expect(response.body.description).toBe('only-description-updated');
      expect(response.body.destinations).toStrictEqual([
        { type: 'workflow', id: 'original-workflow-id' },
      ]);
      expect(response.body.matcher).toBe("env == 'production'");
      expect(response.body.groupBy).toStrictEqual(['service.name']);
      expect(response.body.throttle).toStrictEqual({ interval: '1m' });
    }
  );

  apiTest(
    'partial: updates matcher/groupBy/throttle and preserves name/description/destinations',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'original-policy',
          description: 'original-policy-description',
          destinations: [{ type: 'workflow', id: 'original-workflow-id' }],
          matcher: "env == 'production' && region == 'us-east-1'",
          groupBy: ['service.name'],
          throttle: { interval: '1m' },
        })
      );

      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: {
          matcher: "env == 'staging' && region == 'eu-central-1'",
          groupBy: ['service.name', 'host.name'],
          throttle: { interval: '15m' },
          version: created.version,
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.name).toBe('original-policy');
      expect(response.body.description).toBe('original-policy-description');
      expect(response.body.destinations).toStrictEqual([
        { type: 'workflow', id: 'original-workflow-id' },
      ]);
      expect(response.body.matcher).toBe("env == 'staging' && region == 'eu-central-1'");
      expect(response.body.groupBy).toStrictEqual(['service.name', 'host.name']);
      expect(response.body.throttle).toStrictEqual({ interval: '15m' });
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
          matcher: "env == 'staging'",
          groupBy: ['host.name'],
          throttle: { interval: '2m' },
        })
      );

      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: {
          destinations: [{ type: 'workflow', id: 'updated-dest-workflow' }],
          version: created.version,
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.destinations).toStrictEqual([
        { type: 'workflow', id: 'updated-dest-workflow' },
      ]);
      expect(response.body.name).toBe('dest-policy');
      expect(response.body.description).toBe('dest-policy description');
      expect(response.body.matcher).toBe("env == 'staging'");
      expect(response.body.groupBy).toStrictEqual(['host.name']);
      expect(response.body.throttle).toStrictEqual({ interval: '2m' });
    }
  );

  apiTest(
    'partial: updates groupingMode and throttle strategy together',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'mode-update-policy',
          description: 'will update grouping mode',
          destinations: [{ type: 'workflow', id: 'wf-1' }],
          groupingMode: 'per_episode',
          throttle: { strategy: 'on_status_change' },
        })
      );

      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: {
          groupingMode: 'all',
          throttle: { strategy: 'time_interval', interval: '10m' },
          version: created.version,
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.groupingMode).toBe('all');
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
          groupingMode: 'per_episode',
          throttle: { strategy: 'per_status_interval', interval: '10m' },
        })
      );

      const updated = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: {
          throttle: { strategy: 'on_status_change' },
          version: created.version,
        },
      });

      expect(updated).toHaveStatusCode(200);
      expect(updated.body.throttle).toStrictEqual({
        strategy: 'on_status_change',
        interval: null,
      });

      // Re-fetch via GET to confirm the persisted value matches the PATCH response.
      const fetched = await apiServices.alertingV2.actionPolicies.get(created.id);
      expect(fetched.throttle).toStrictEqual({ strategy: 'on_status_change', interval: null });
    }
  );

  apiTest(
    'nullable: clears groupingMode/groupBy/throttle when set to null',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'clear-mode-policy',
          description: 'will clear grouping mode',
          destinations: [{ type: 'workflow', id: 'wf-1' }],
          groupingMode: 'per_field',
          groupBy: ['host.name'],
          throttle: { strategy: 'time_interval', interval: '5m' },
        })
      );

      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: {
          groupingMode: null,
          groupBy: null,
          throttle: null,
          version: created.version,
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.groupingMode).toBeNull();
      expect(response.body.groupBy).toBeNull();
      expect(response.body.throttle).toBeNull();
    }
  );

  apiTest(
    'nullable: clears matcher/groupBy/throttle when set to null',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'nullable-policy',
          description: 'nullable-policy description',
          destinations: [{ type: 'workflow', id: 'nullable-workflow-id' }],
          matcher: "env == 'production'",
          groupBy: ['service.name'],
          throttle: { interval: '5m' },
        })
      );

      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: {
          matcher: null,
          groupBy: null,
          throttle: null,
          version: created.version,
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.matcher).toBeNull();
      expect(response.body.groupBy).toBeNull();
      expect(response.body.throttle).toBeNull();
      expect(response.body.name).toBe('nullable-policy');
      expect(response.body.destinations).toStrictEqual([
        { type: 'workflow', id: 'nullable-workflow-id' },
      ]);
    }
  );

  apiTest('concurrency: returns 409 when version is stale', async ({ apiClient, apiServices }) => {
    const created = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({
        name: 'conflict-policy',
        description: 'conflict-policy description',
        destinations: [{ type: 'workflow', id: 'conflict-workflow-id' }],
      })
    );
    const staleVersion = created.version;

    const firstUpdate = await apiClient.patch(getActionPolicyUrl(created.id), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: { name: 'first-update', version: staleVersion },
    });
    expect(firstUpdate).toHaveStatusCode(200);

    const secondUpdate = await apiClient.patch(getActionPolicyUrl(created.id), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: { name: 'second-update', version: staleVersion },
    });
    expect(secondUpdate).toHaveStatusCode(409);
  });

  apiTest('not found: returns 404 for a non-existent id', async ({ apiClient }) => {
    const response = await apiClient.patch(getActionPolicyUrl('non-existent-id'), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: {
        name: 'some-name',
        description: 'some-description',
        destinations: [{ type: 'workflow', id: 'some-workflow-id' }],
        version: 'WzEsMV0=',
      },
    });

    expect(response).toHaveStatusCode(404);
  });

  apiTest('validation: rejects empty destinations array', async ({ apiClient, apiServices }) => {
    const created = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'empty-dest-policy' })
    );

    const response = await apiClient.patch(getActionPolicyUrl(created.id), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: { destinations: [], version: created.version },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects missing version', async ({ apiClient, apiServices }) => {
    const created = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'no-version-policy' })
    );

    const response = await apiClient.patch(getActionPolicyUrl(created.id), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: { name: 'no-version-update' },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects empty version', async ({ apiClient, apiServices }) => {
    const created = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: 'empty-version-policy' })
    );

    const response = await apiClient.patch(getActionPolicyUrl(created.id), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: { name: 'empty-version-update', version: '' },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'validation: rejects version over the maximum length',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'long-version-policy' })
      );

      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: {
          name: 'long-version-update',
          version: 'a'.repeat(VERSION_MAX_LENGTH + 1),
        },
      });

      expect(response).toHaveStatusCode(400);
    }
  );

  apiTest(
    'validation: rejects empty name (when name is provided)',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'empty-name-policy' })
      );

      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: { name: '', version: created.version },
      });

      expect(response).toHaveStatusCode(400);
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
          version: created.version,
        },
      });

      expect(response).toHaveStatusCode(400);
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
        body: { foo: 'bar', version: created.version },
      });

      expect(response).toHaveStatusCode(400);
    }
  );

  apiTest('validation: rejects id over the maximum length', async ({ apiClient }) => {
    const response = await apiClient.patch(getActionPolicyUrl('a'.repeat(ID_MAX_LENGTH + 1)), {
      headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
      body: {
        name: 'too-long-id-update',
        version: 'WzEsMV0=',
      },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'authorization: 200 with full alerting_v2 privileges (write)',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'writer-can-patch' })
      );

      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...writerHeaders },
        body: { name: 'writer-can-patch-updated', version: created.version },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.name).toBe('writer-can-patch-updated');
    }
  );

  apiTest(
    'authorization: 403 with read-only alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_ACTION_POLICIES_READ_ROLE
      );
      const created = await apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({ name: 'reader-cannot-patch' })
      );

      const response = await apiClient.patch(getActionPolicyUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
        body: { name: 'reader-cannot-patch-updated', version: created.version },
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
        body: { name: 'no-access-cannot-patch-updated', version: created.version },
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
