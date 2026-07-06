/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import { ID_MAX_LENGTH, MAX_DESCRIPTION_LENGTH, MAX_NAME_LENGTH } from '@kbn/alerting-v2-schemas';
import {
  ALERTING_V2_RULES_ALL_ROLE,
  ALERTING_V2_RULES_READ_ROLE,
  apiTest,
  buildCreateRuleData,
  getRuleUrl,
  NO_ACCESS_ROLE,
  testData,
} from '../../../fixtures';

const MAX_OWNER_LENGTH = 256;

apiTest.describe('Update rule API', { tag: '@local-stateful-classic' }, () => {
  let writerCredentials: RoleApiCredentials;
  let writerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    writerCredentials = await requestAuth.getApiKeyForCustomRole(ALERTING_V2_RULES_ALL_ROLE);
    writerHeaders = { ...testData.COMMON_HEADERS, ...writerCredentials.apiKeyHeader };
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
  });

  apiTest(
    'update: should partially update the rule and refresh audit fields',
    async ({ apiClient, apiServices }) => {
      const createData = buildCreateRuleData({
        metadata: { name: 'original-name', description: 'original description', tags: ['cpu'] },
      });
      const created = await apiServices.alertingV2.rules.create(createData);
      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: { metadata: { name: 'renamed' } },
      });
      expect(response).toHaveStatusCode(200);
      // Patched field reflects the new value.
      expect(response.body.metadata.name).toBe('renamed');
      // Other metadata fields are preserved (PATCH is non-destructive).
      expect(response.body.metadata.description).toBe('original description');
      expect(response.body.metadata.tags).toStrictEqual(['cpu']);
      // Non-touched top-level fields are preserved.
      expect(response.body.kind).toBe(created.kind);
      expect(response.body.schedule).toStrictEqual(created.schedule);
      expect(response.body.query).toStrictEqual(created.query);
      // Audit fields: createdAt/createdBy preserved, updatedAt/updatedBy refreshed.
      expect(response.body.id).toBe(created.id);
      expect(response.body.createdAt).toBe(created.createdAt);
      expect(response.body.createdBy).toBe(created.createdBy);
      expect(response.body.updatedAt).not.toBe(created.updatedAt);
    }
  );

  apiTest('update: should toggle the enabled field', async ({ apiClient, apiServices }) => {
    const created = await apiServices.alertingV2.rules.create(
      buildCreateRuleData({ metadata: { name: 'rule-to-disable' } })
    );
    expect(created.enabled).toBe(true);
    const response = await apiClient.patch(getRuleUrl(created.id), {
      headers: writerHeaders,
      body: { enabled: false },
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body.enabled).toBe(false);
  });

  apiTest(
    'update: should update schedule.lookback while preserving schedule.every',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'rule-with-schedule' },
          schedule: { every: '5m', lookback: '10m' },
        })
      );

      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: { schedule: { lookback: '15m' } },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.schedule).toStrictEqual({ every: '5m', lookback: '15m' });
    }
  );

  apiTest(
    'update: should update only the query while preserving metadata and schedule',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'rule-query-update', tags: ['cpu'] },
          schedule: { every: '5m', lookback: '10m' },
        })
      );

      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: {
          query: { format: 'standalone', breach: { query: 'FROM new-index-* | LIMIT 100' } },
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.query).toStrictEqual({
        format: 'standalone',
        breach: { query: 'FROM new-index-* | LIMIT 100' },
      });
      expect(response.body.metadata).toStrictEqual(created.metadata);
      expect(response.body.schedule).toStrictEqual(created.schedule);
    }
  );

  apiTest(
    'update: should update query to standalone format with a recovery query',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-add-recover' } })
      );

      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: {
          recovery_strategy: 'query',
          query: {
            format: 'standalone',
            breach: {
              query:
                'FROM logs-* | WHERE severity == "high" | STATS count = COUNT(*) BY host.name | WHERE count >= 1',
            },
            recovery: {
              query:
                'FROM logs-* | WHERE severity == "resolved" | STATS count = COUNT(*) BY host.name | WHERE count >= 1',
            },
          },
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.recovery_strategy).toBe('query');
      expect(response.body.query).toStrictEqual({
        format: 'standalone',
        breach: {
          query:
            'FROM logs-* | WHERE severity == "high" | STATS count = COUNT(*) BY host.name | WHERE count >= 1',
        },
        recovery: {
          query:
            'FROM logs-* | WHERE severity == "resolved" | STATS count = COUNT(*) BY host.name | WHERE count >= 1',
        },
      });
      expect(response.body.schedule).toStrictEqual(created.schedule);
    }
  );

  apiTest(
    'update: should add a no_data query to a standalone-format rule',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-add-no-data' } })
      );

      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: {
          no_data_strategy: 'emit',
          query: {
            format: 'standalone',
            breach: { query: 'FROM logs-* | LIMIT 1' },
            no_data: { query: 'FROM logs-* | STATS c = COUNT(*) | WHERE c == 0' },
          },
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.no_data_strategy).toBe('emit');
      expect(response.body.query).toStrictEqual({
        format: 'standalone',
        breach: { query: 'FROM logs-* | LIMIT 1' },
        no_data: { query: 'FROM logs-* | STATS c = COUNT(*) | WHERE c == 0' },
      });
      expect(response.body.schedule).toStrictEqual(created.schedule);
    }
  );

  apiTest('update: should update query to composed format', async ({ apiClient, apiServices }) => {
    const created = await apiServices.alertingV2.rules.create(
      buildCreateRuleData({ metadata: { name: 'rule-to-composed' } })
    );

    const response = await apiClient.patch(getRuleUrl(created.id), {
      headers: writerHeaders,
      body: {
        query: {
          format: 'composed',
          base: 'FROM logs-* | STATS count = COUNT(*) BY host.name',
          breach: { segment: 'WHERE count >= 10' },
        },
      },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.query).toStrictEqual({
      format: 'composed',
      base: 'FROM logs-* | STATS count = COUNT(*) BY host.name',
      breach: { segment: 'WHERE count >= 10' },
    });
    expect(response.body.schedule).toStrictEqual(created.schedule);
  });

  apiTest(
    'update: should update query to composed format with a recovery segment',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-to-composed-recover' } })
      );

      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: {
          recovery_strategy: 'query',
          query: {
            format: 'composed',
            base: 'FROM logs-* | STATS max_val = MAX(value) BY host.name',
            breach: { segment: 'WHERE max_val >= 10' },
            recovery: { segment: 'WHERE max_val < 5' },
          },
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.recovery_strategy).toBe('query');
      expect(response.body.query).toStrictEqual({
        format: 'composed',
        base: 'FROM logs-* | STATS max_val = MAX(value) BY host.name',
        breach: { segment: 'WHERE max_val >= 10' },
        recovery: { segment: 'WHERE max_val < 5' },
      });
      expect(response.body.schedule).toStrictEqual(created.schedule);
    }
  );

  apiTest(
    'update: should return 409 when the request body version is stale',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-stale-version' } })
      );
      const firstUpdate = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: { metadata: { name: 'first-rename' } },
      });
      expect(firstUpdate).toHaveStatusCode(200);
      expect(firstUpdate.body.version).not.toBe(created.version);

      const staleUpdate = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: { version: created.version, metadata: { name: 'second-rename' } },
      });
      expect(staleUpdate).toHaveStatusCode(409);
    }
  );

  apiTest(
    'update: should clear an optional field when set to null',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'rule-with-grouping' },
          grouping: { fields: ['host.name'] },
        })
      );
      expect(created.grouping).toStrictEqual({ fields: ['host.name'] });

      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: { grouping: null },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.grouping).toBeUndefined();

      const persisted = await apiServices.alertingV2.rules.get(created.id);
      expect(persisted.grouping).toBeUndefined();
    }
  );

  apiTest('status: should return 404 when the rule does not exist', async ({ apiClient }) => {
    const response = await apiClient.patch(getRuleUrl('does-not-exist'), {
      headers: writerHeaders,
      body: { metadata: { name: 'whatever' } },
    });
    expect(response).toHaveStatusCode(404);
  });

  apiTest(
    'validation: should reject ids longer than ID_MAX_LENGTH with a 400',
    async ({ apiClient }) => {
      const tooLongId = 'a'.repeat(ID_MAX_LENGTH + 1);
      const response = await apiClient.patch(getRuleUrl(tooLongId), {
        headers: writerHeaders,
        body: { metadata: { name: 'whatever' } },
      });
      expect(response).toHaveStatusCode(400);
    }
  );

  apiTest(
    'validation: should reject body when metadata.name exceeds MAX_NAME_LENGTH',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-to-rename' } })
      );
      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: { metadata: { name: 'a'.repeat(MAX_NAME_LENGTH + 1) } },
      });
      expect(response).toHaveStatusCode(400);
    }
  );

  apiTest(
    'validation: should reject body with empty metadata.name',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-with-empty-rename' } })
      );
      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: { metadata: { name: '' } },
      });
      expect(response).toHaveStatusCode(400);
    }
  );

  apiTest(
    'validation: should reject body when metadata.description exceeds MAX_DESCRIPTION_LENGTH',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-with-long-description' } })
      );
      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: { metadata: { description: 'a'.repeat(MAX_DESCRIPTION_LENGTH + 1) } },
      });
      expect(response).toHaveStatusCode(400);
    }
  );

  apiTest(
    'validation: should reject body when metadata.owner exceeds the maximum length',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-with-long-owner' } })
      );
      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: { metadata: { owner: 'a'.repeat(MAX_OWNER_LENGTH + 1) } },
      });
      expect(response).toHaveStatusCode(400);
    }
  );

  apiTest(
    'validation: should reject body with unknown metadata keys (strict schema)',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-strict-metadata' } })
      );
      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: { metadata: { unknownField: 'nope' } },
      });
      expect(response).toHaveStatusCode(400);
    }
  );

  apiTest(
    'validation: should reject body when schedule.every is below the minimum interval',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-bad-schedule' } })
      );
      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: { schedule: { every: '1s' } },
      });
      expect(response).toHaveStatusCode(400);
    }
  );

  apiTest(
    'validation: should reject state_transition updates on non-alert rules',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        // Signal rules must opt out of the default `state_transition`,
        // which the schema only allows for `kind: 'alert'`.
        buildCreateRuleData({
          kind: 'signal',
          state_transition: undefined,
          recovery_strategy: undefined,
          query: {
            format: 'standalone',
            breach: { query: 'FROM logs-* | LIMIT 10' },
          },
          metadata: { name: 'signal-rule' },
        })
      );
      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: { state_transition: { pending_count: 3, pending_timeframe: '5m' } },
      });
      expect(response).toHaveStatusCode(400);
    }
  );

  apiTest(
    'authorization: should return 200 for a user with full alerting_v2 privileges',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'writer-can-update' } })
      );
      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: { metadata: { name: 'writer-renamed' } },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.metadata.name).toBe('writer-renamed');
    }
  );

  apiTest(
    'authorization: should return 403 for a user with read-only alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'reader-cannot-update' } })
      );
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_RULES_READ_ROLE
      );
      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
        body: { metadata: { name: 'attempted-rename' } },
      });
      expect(response).toHaveStatusCode(403);
      // Verify the rule was not modified.
      const stored = await apiServices.alertingV2.rules.get(created.id);
      expect(stored.metadata.name).toBe('reader-cannot-update');
    }
  );

  apiTest(
    'authorization: should return 403 for a user without alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'noaccess-cannot-update' } })
      );
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
        body: { metadata: { name: 'attempted-rename' } },
      });
      expect(response).toHaveStatusCode(403);
      const stored = await apiServices.alertingV2.rules.get(created.id);
      expect(stored.metadata.name).toBe('noaccess-cannot-update');
    }
  );
});
