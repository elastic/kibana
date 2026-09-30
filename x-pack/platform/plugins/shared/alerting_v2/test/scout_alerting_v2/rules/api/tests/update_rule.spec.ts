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
} from '../fixtures';

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
      expect(response.body.created_at).toBe(created.created_at);
      expect(response.body.created_by).toStrictEqual(created.created_by);
      expect(response.body.updated_at).not.toBe(created.updated_at);
      expect(response.body.metadata.version).toBe(created.metadata.version + 1);
    }
  );

  apiTest(
    'update: should reject a body containing enabled and never toggle lifecycle',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-to-disable' } })
      );
      expect(created.enabled).toBe(true);
      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: { enabled: false },
      });
      expect(response).toHaveStatusCode(400);

      const stored = await apiServices.alertingV2.rules.get(created.id);
      expect(stored.enabled).toBe(true);
    }
  );

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
          query: { base: 'FROM new-index-* | LIMIT 100' },
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.query).toStrictEqual({ base: 'FROM new-index-* | LIMIT 100' });
      expect(response.body.metadata).toStrictEqual({
        ...created.metadata,
        version: created.metadata.version + 1,
      });
      expect(response.body.schedule).toStrictEqual(created.schedule);
    }
  );

  apiTest(
    'update: should switch recovery to a standalone recovery query',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-add-recover' } })
      );

      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: {
          recovery: {
            strategy: 'query',
            query:
              'FROM logs-* | WHERE severity == "resolved" | STATS count = COUNT(*) BY host.name | WHERE count >= 1',
          },
          query: {
            base: 'FROM logs-* | WHERE severity == "high" | STATS count = COUNT(*) BY host.name | WHERE count >= 1',
          },
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.recovery).toStrictEqual({
        strategy: 'query',
        query:
          'FROM logs-* | WHERE severity == "resolved" | STATS count = COUNT(*) BY host.name | WHERE count >= 1',
      });
      expect(response.body.query).toStrictEqual({
        base: 'FROM logs-* | WHERE severity == "high" | STATS count = COUNT(*) BY host.name | WHERE count >= 1',
      });
      expect(response.body.schedule).toStrictEqual(created.schedule);
    }
  );

  apiTest(
    'update: should add a no_data presence query to a rule',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-add-no-data' } })
      );
      expect(created.no_data).toStrictEqual({ strategy: 'ignore' });

      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: {
          no_data: {
            strategy: 'keep_last',
            query: 'FROM logs-* | STATS c = COUNT(*) | WHERE c == 0',
          },
          query: { base: 'FROM logs-* | LIMIT 1' },
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.no_data).toStrictEqual({
        strategy: 'keep_last',
        query: 'FROM logs-* | STATS c = COUNT(*) | WHERE c == 0',
      });
      expect(response.body.query).toStrictEqual({ base: 'FROM logs-* | LIMIT 1' });
      expect(response.body.schedule).toStrictEqual(created.schedule);
    }
  );

  apiTest(
    'validation: rejects a no_data strategy the merged query cannot tell apart from a breach',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-no-data-indistinguishable' } })
      );

      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: { no_data: { strategy: 'keep_last' } },
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('INVALID_RULE_QUERY_CONFIG');

      const persisted = await apiServices.alertingV2.rules.get(created.id);
      expect(persisted.no_data).toStrictEqual({ strategy: 'ignore' });
    }
  );

  apiTest(
    'validation: rejects the "alert" no_data strategy',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-no-data-alert' } })
      );

      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: { no_data: { strategy: 'alert' } },
      });

      expect(response).toHaveStatusCode(400);

      const persisted = await apiServices.alertingV2.rules.get(created.id);
      expect(persisted.no_data).toStrictEqual({ strategy: 'ignore' });
    }
  );

  apiTest(
    'update: should add a breach segment to the query',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-to-composed' } })
      );

      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: {
          query: {
            base: 'FROM logs-* | STATS count = COUNT(*) BY host.name',
            breach: { segment: 'WHERE count >= 10' },
          },
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.query).toStrictEqual({
        base: 'FROM logs-* | STATS count = COUNT(*) BY host.name',
        breach: { segment: 'WHERE count >= 10' },
      });
      expect(response.body.schedule).toStrictEqual(created.schedule);
    }
  );

  apiTest(
    'update: persists a conditionless query without a breach block',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-to-conditionless' } })
      );
      const query = { base: 'FROM logs-* | STATS count = COUNT(*) BY host.name' };

      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: { query },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.query).toStrictEqual(query);

      const persisted = await apiServices.alertingV2.rules.get(created.id);
      expect(persisted.query).toStrictEqual(query);
    }
  );

  apiTest(
    'update: should switch recovery to a condition segment',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-to-condition-recover' } })
      );

      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: {
          recovery: { strategy: 'condition', segment: 'WHERE max_val < 5' },
          query: {
            base: 'FROM logs-* | STATS max_val = MAX(value) BY host.name',
            breach: { segment: 'WHERE max_val >= 10' },
          },
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.recovery).toStrictEqual({
        strategy: 'condition',
        segment: 'WHERE max_val < 5',
      });
      expect(response.body.query).toStrictEqual({
        base: 'FROM logs-* | STATS max_val = MAX(value) BY host.name',
        breach: { segment: 'WHERE max_val >= 10' },
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
      expect(staleUpdate.body.code).toBe('RULE_VERSION_CONFLICT');
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

  apiTest(
    'update: should clear all tags when metadata.tags is set to null',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'rule-with-tags', tags: ['prod', 'infra'] },
        })
      );
      expect(created.metadata.tags).toStrictEqual(['prod', 'infra']);

      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: { metadata: { tags: null } },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.metadata.tags).toBeUndefined();

      // The cleared tags must survive a re-read (the original bug: they came back).
      const persisted = await apiServices.alertingV2.rules.get(created.id);
      expect(persisted.metadata.tags).toBeUndefined();
    }
  );

  apiTest(
    'update: should replace tags when metadata.tags is a non-empty array',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-retag', tags: ['old'] } })
      );

      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: { metadata: { tags: ['prod', 'infra'] } },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.metadata.tags).toStrictEqual(['prod', 'infra']);
    }
  );

  apiTest(
    'validation: should reject metadata.tags as an empty array (null clears tags)',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-empty-tags', tags: ['keep'] } })
      );
      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: { metadata: { tags: [] } },
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
      // The rejected update must not have persisted.
      const stored = await apiServices.alertingV2.rules.get(created.id);
      expect(stored.metadata.tags).toStrictEqual(['keep']);
    }
  );

  apiTest('status: should return 404 when the rule does not exist', async ({ apiClient }) => {
    const response = await apiClient.patch(getRuleUrl('does-not-exist'), {
      headers: writerHeaders,
      body: { metadata: { name: 'whatever' } },
    });
    expect(response).toHaveStatusCode(404);
    expect(response.body.code).toBe('RULE_NOT_FOUND');
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
      expect(response.body.code).toBe('BAD_REQUEST');
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
      expect(response.body.code).toBe('BAD_REQUEST');
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
      expect(response.body.code).toBe('BAD_REQUEST');
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
      expect(response.body.code).toBe('BAD_REQUEST');
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
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );

  apiTest(
    'validation: should reject body with unknown top-level keys (strict schema)',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-strict-top-level' } })
      );
      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: { metadta: { name: 'typo field' } },
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
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
      expect(response.body.code).toBe('BAD_REQUEST');
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
          recovery: undefined,
          no_data: undefined,
          query: { base: 'FROM logs-* | LIMIT 10' },
          metadata: { name: 'signal-rule' },
        })
      );
      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: { state_transition: { pending: { count: 3, timeframe: '5m' } } },
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('INVALID_STATE_TRANSITION');
    }
  );

  apiTest(
    'validation: should reject switching recovery to "manual" while a recovering delay is stored',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'rule-inert-recovery-delay-on-update' },
          recovery: { strategy: 'no_breach' },
          state_transition: { pending: { count: 0 }, recovering: { count: 3 } },
        })
      );

      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: { recovery: { strategy: 'manual' } },
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('INVALID_STATE_TRANSITION_CONFIG');

      const stored = await apiServices.alertingV2.rules.get(created.id);
      expect(stored.recovery).toStrictEqual({ strategy: 'no_breach' });
    }
  );

  const buildSignalRuleData = (name: string) =>
    buildCreateRuleData({
      kind: 'signal',
      state_transition: undefined,
      recovery: undefined,
      no_data: undefined,
      query: { base: 'FROM logs-* | LIMIT 10' },
      metadata: { name },
    });

  apiTest(
    'validation: should reject setting no_data on a signal rule',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildSignalRuleData('signal-with-no-data')
      );
      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: { no_data: { strategy: 'keep_last' } },
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('INVALID_SIGNAL_RULE');
      // The rejected update must not have persisted.
      const stored = await apiServices.alertingV2.rules.get(created.id);
      expect(stored.no_data).toBeUndefined();
    }
  );

  apiTest(
    'validation: should reject setting recovery on a signal rule',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildSignalRuleData('signal-with-recovery')
      );
      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: { recovery: { strategy: 'no_breach' } },
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('INVALID_SIGNAL_RULE');

      const stored = await apiServices.alertingV2.rules.get(created.id);
      expect(stored.recovery).toBeUndefined();
    }
  );

  apiTest(
    'validation: should reject recovery.strategy "condition" on a rule whose query has no breach',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'condition-recovery-no-breach' },
          query: { base: 'FROM logs-* | STATS count = COUNT(*) BY host.name' },
        })
      );
      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: { recovery: { strategy: 'condition', segment: 'WHERE count < 5' } },
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('INVALID_RULE_QUERY_CONFIG');
    }
  );

  apiTest(
    'validation: should reject removing query.breach while recovery.strategy is "condition"',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'condition-recovery-breach-removed' },
          recovery: { strategy: 'condition', segment: 'WHERE count < 5' },
          query: {
            base: 'FROM logs-* | STATS count = COUNT(*) BY host.name',
            breach: { segment: 'WHERE count >= 10' },
          },
        })
      );
      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: { query: { base: 'FROM logs-* | STATS count = COUNT(*) BY host.name' } },
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('INVALID_RULE_QUERY_CONFIG');
      // The rejected update must not have persisted: the breach block stays.
      const stored = await apiServices.alertingV2.rules.get(created.id);
      expect(stored.query.breach).toStrictEqual({ segment: 'WHERE count >= 10' });
    }
  );

  apiTest(
    'validation: should reject a recovery segment that does not parse',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'condition-recovery-unparseable' },
          recovery: { strategy: 'condition', segment: 'WHERE count < 5' },
          query: {
            base: 'FROM logs-* | STATS count = COUNT(*) BY host.name',
            breach: { segment: 'WHERE count >= 10' },
          },
        })
      );
      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: { recovery: { strategy: 'condition', segment: 'WHERE' } },
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
      // The rejected update must not have persisted.
      const stored = await apiServices.alertingV2.rules.get(created.id);
      expect(stored.recovery).toStrictEqual({ strategy: 'condition', segment: 'WHERE count < 5' });
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

  apiTest(
    'builder_type: should reject query change on a builder rule without explicit builder_type clear',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'builder-rule', builder_type: 'threshold' },
        })
      );
      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: {
          query: { base: 'FROM new-index | LIMIT 1' },
        },
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BUILDER_TYPE_NOT_CLEARED');
      // Rule should remain unchanged
      const stored = await apiServices.alertingV2.rules.get(created.id);
      expect(stored.metadata.builder_type).toBe('threshold');
    }
  );

  apiTest(
    'builder_type: should allow query change on a builder rule when builder_type is explicitly cleared',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'builder-rule-clear', builder_type: 'threshold' },
        })
      );
      const response = await apiClient.patch(getRuleUrl(created.id), {
        headers: writerHeaders,
        body: {
          query: { base: 'FROM new-index | LIMIT 1' },
          metadata: { builder_type: null },
        },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.metadata.builder_type).toBeUndefined();
    }
  );
});
