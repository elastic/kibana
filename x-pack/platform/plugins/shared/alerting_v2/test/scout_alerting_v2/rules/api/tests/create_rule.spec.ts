/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import { MAX_DESCRIPTION_LENGTH, MAX_NAME_LENGTH } from '@kbn/alerting-v2-schemas';

const MAX_OWNER_LENGTH = 256;
import {
  ALERTING_V2_RULES_ALL_ROLE,
  ALERTING_V2_RULES_READ_ROLE,
  apiTest,
  buildCreateRuleData,
  NO_ACCESS_ROLE,
  testData,
} from '../fixtures';

apiTest.describe('Create rule API', { tag: '@local-stateful-classic' }, () => {
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
    'create: returns 201 with the created rule and persists it',
    async ({ apiClient, apiServices }) => {
      const body = buildCreateRuleData({
        metadata: {
          name: 'created-rule',
          description: 'a freshly created rule',
          tags: ['cpu', 'production'],
        },
      });
      const response = await apiClient.post(testData.RULE_API_PATH, {
        headers: writerHeaders,
        body,
      });
      expect(response).toHaveStatusCode(201);
      expect(response.body.kind).toBe(body.kind);
      expect(response.body.metadata).toStrictEqual({ ...body.metadata, version: 1 });
      expect(response.body.schedule).toStrictEqual(body.schedule);
      expect(response.body.query).toStrictEqual(body.query);

      const persisted = await apiServices.alertingV2.rules.get(response.body.id);
      expect(persisted.id).toBe(response.body.id);
      expect(persisted.metadata.name).toBe('created-rule');
      expect(persisted.metadata.version).toBe(1);
    }
  );

  apiTest('validation: rejects body with missing metadata.name', async ({ apiClient }) => {
    const body = buildCreateRuleData();
    // Replace metadata with one that has no name.
    const invalidBody = { ...body, metadata: { description: 'no name here' } };
    const response = await apiClient.post(testData.RULE_API_PATH, {
      headers: writerHeaders,
      body: invalidBody,
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest(
    'validation: rejects body when metadata.name exceeds MAX_NAME_LENGTH',
    async ({ apiClient }) => {
      const body = buildCreateRuleData({
        metadata: { name: 'a'.repeat(MAX_NAME_LENGTH + 1) },
      });
      const response = await apiClient.post(testData.RULE_API_PATH, {
        headers: writerHeaders,
        body,
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );

  apiTest(
    'validation: rejects body with unknown metadata keys (strict schema)',
    async ({ apiClient }) => {
      const body = buildCreateRuleData();
      const invalidBody = {
        ...body,
        metadata: { ...body.metadata, unknownField: 'nope' },
      };
      const response = await apiClient.post(testData.RULE_API_PATH, {
        headers: writerHeaders,
        body: invalidBody,
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );

  apiTest(
    'validation: rejects body with unknown top-level keys (strict schema)',
    async ({ apiClient }) => {
      const body = buildCreateRuleData();
      const invalidBody = {
        ...body,
        unknown_field: { name: 'typo field' },
      };
      const response = await apiClient.post(testData.RULE_API_PATH, {
        headers: writerHeaders,
        body: invalidBody,
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );

  apiTest('validation: rejects body with missing metadata', async ({ apiClient }) => {
    const { metadata: _metadata, ...rest } = buildCreateRuleData();
    const response = await apiClient.post(testData.RULE_API_PATH, {
      headers: writerHeaders,
      body: rest,
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: rejects body with empty metadata.name', async ({ apiClient }) => {
    const body = buildCreateRuleData({ metadata: { name: '' } });
    const response = await apiClient.post(testData.RULE_API_PATH, {
      headers: writerHeaders,
      body,
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest(
    'validation: rejects body when metadata.description exceeds MAX_DESCRIPTION_LENGTH',
    async ({ apiClient }) => {
      const body = buildCreateRuleData({
        metadata: { name: 'long-description', description: 'a'.repeat(MAX_DESCRIPTION_LENGTH + 1) },
      });
      const response = await apiClient.post(testData.RULE_API_PATH, {
        headers: writerHeaders,
        body,
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );

  apiTest(
    'validation: rejects body when metadata.owner exceeds the maximum length',
    async ({ apiClient }) => {
      const body = buildCreateRuleData({
        metadata: { name: 'long-owner', owner: 'a'.repeat(MAX_OWNER_LENGTH + 1) },
      });
      const response = await apiClient.post(testData.RULE_API_PATH, {
        headers: writerHeaders,
        body,
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );

  apiTest('validation: rejects body with an unknown kind value', async ({ apiClient }) => {
    const body = { ...buildCreateRuleData(), kind: 'unknown' };
    const response = await apiClient.post(testData.RULE_API_PATH, {
      headers: writerHeaders,
      body,
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest(
    'validation: rejects body when schedule.every is below the minimum interval',
    async ({ apiClient }) => {
      const body = buildCreateRuleData({ schedule: { every: '1s' } });
      const response = await apiClient.post(testData.RULE_API_PATH, {
        headers: writerHeaders,
        body,
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );

  apiTest('validation: rejects body with an empty query.base', async ({ apiClient }) => {
    const body = buildCreateRuleData({
      query: { base: '' },
    });
    const response = await apiClient.post(testData.RULE_API_PATH, {
      headers: writerHeaders,
      body,
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: rejects state_transition for non-alert kinds', async ({ apiClient }) => {
    const body = buildCreateRuleData({
      kind: 'signal',
      recovery: undefined,
      no_data: undefined,
      state_transition: { pending: { count: 3, timeframe: '5m' } },
    });
    const response = await apiClient.post(testData.RULE_API_PATH, {
      headers: writerHeaders,
      body,
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: rejects a signal rule that sets recovery', async ({ apiClient }) => {
    const body = buildCreateRuleData({
      kind: 'signal',
      state_transition: undefined,
      recovery: { strategy: 'query', query: 'FROM logs-* | LIMIT 1' },
      no_data: undefined,
      query: { base: 'FROM logs-* | LIMIT 1' },
    });
    const response = await apiClient.post(testData.RULE_API_PATH, {
      headers: writerHeaders,
      body,
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: rejects a signal rule that sets no_data', async ({ apiClient }) => {
    const body = buildCreateRuleData({
      kind: 'signal',
      state_transition: undefined,
      recovery: undefined,
      no_data: { strategy: 'keep_last', query: 'FROM logs-* | LIMIT 1' },
      query: { base: 'FROM logs-* | LIMIT 1' },
    });
    const response = await apiClient.post(testData.RULE_API_PATH, {
      headers: writerHeaders,
      body,
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest(
    'validation: rejects recovery.strategy "query" without a query field',
    async ({ apiClient }) => {
      const body = {
        ...buildCreateRuleData({ metadata: { name: 'invalid-recovery' } }),
        recovery: { strategy: 'query' },
      };
      const response = await apiClient.post(testData.RULE_API_PATH, {
        headers: writerHeaders,
        body,
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );

  apiTest(
    'validation: rejects recovery.strategy "condition" without query.breach',
    async ({ apiClient }) => {
      const body = buildCreateRuleData({
        metadata: { name: 'invalid-condition-recovery' },
        query: { base: 'FROM logs-* | STATS max_val = MAX(value) BY host.name' },
        recovery: { strategy: 'condition', segment: 'WHERE max_val < 5' },
      });
      const response = await apiClient.post(testData.RULE_API_PATH, {
        headers: writerHeaders,
        body,
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );

  apiTest(
    'validation: rejects recovery with strategy "no_breach" that also carries a query field',
    async ({ apiClient }) => {
      const body = {
        ...buildCreateRuleData({ metadata: { name: 'invalid-no-breach' } }),
        recovery: { strategy: 'no_breach', query: 'FROM logs-* | LIMIT 1' },
      };
      const response = await apiClient.post(testData.RULE_API_PATH, {
        headers: writerHeaders,
        body,
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );

  apiTest(
    'validation: rejects a recovering delay when recovery never happens',
    async ({ apiClient }) => {
      const body = buildCreateRuleData({
        metadata: { name: 'invalid-inert-recovery-delay' },
        recovery: { strategy: 'manual' },
        state_transition: { pending: { count: 0 }, recovering: { count: 2 } },
      });
      const response = await apiClient.post(testData.RULE_API_PATH, {
        headers: writerHeaders,
        body,
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );

  apiTest(
    'create: returns 201 with the signal kind round-tripped to the response',
    async ({ apiClient, apiServices }) => {
      // Signal rules must opt out of the defaults the schema only allows for
      // `kind: 'alert'`.
      const body = buildCreateRuleData({
        kind: 'signal',
        state_transition: undefined,
        recovery: undefined,
        no_data: undefined,
        query: { base: 'FROM logs-* | LIMIT 10' },
        metadata: { name: 'created-signal-rule' },
      });
      const response = await apiClient.post(testData.RULE_API_PATH, {
        headers: writerHeaders,
        body,
      });
      expect(response).toHaveStatusCode(201);
      expect(response.body.kind).toBe('signal');
      expect(response.body.metadata.name).toBe('created-signal-rule');
      // Signal rules have no episodes, so neither lifecycle block is stored.
      expect(response.body.recovery).toBeUndefined();
      expect(response.body.no_data).toBeUndefined();

      const persisted = await apiServices.alertingV2.rules.get(response.body.id);
      expect(persisted.kind).toBe('signal');
      expect(persisted.recovery).toBeUndefined();
      expect(persisted.no_data).toBeUndefined();
    }
  );

  apiTest(
    'create: returns 201 and round-trips every optional field',
    async ({ apiClient, apiServices }) => {
      const body = buildCreateRuleData({
        metadata: {
          name: 'full-rule',
          description: 'fully populated rule',
          owner: 'team-a',
          tags: ['critical', 'prod'],
        },
        schedule: { every: '5m', lookback: '10m' },
        query: { base: 'FROM logs-* | LIMIT 10' },
        state_transition: { pending: { count: 3 } },
        grouping: { fields: ['host.name'] },
      });
      const response = await apiClient.post(testData.RULE_API_PATH, {
        headers: writerHeaders,
        body,
      });
      expect(response).toHaveStatusCode(201);
      expect(response.body.metadata).toStrictEqual({ ...body.metadata, version: 1 });
      expect(response.body.schedule).toStrictEqual(body.schedule);
      expect(response.body.query).toStrictEqual(body.query);
      expect(response.body.state_transition).toStrictEqual(body.state_transition);
      expect(response.body.grouping).toStrictEqual(body.grouping);
      expect(response.body.recovery).toStrictEqual({ strategy: 'no_breach' });
      expect(response.body.no_data).toStrictEqual({ strategy: 'ignore' });

      const persisted = await apiServices.alertingV2.rules.get(response.body.id);
      expect(persisted.grouping).toStrictEqual(body.grouping);
    }
  );

  apiTest(
    'validation: rejects an alert rule that omits recovery or no_data',
    async ({ apiClient }) => {
      const { recovery: _recovery, ...withoutRecovery } = buildCreateRuleData({
        metadata: { name: 'alert-rule-without-recovery' },
        state_transition: undefined,
      });

      const { no_data: _noData, ...withoutNoData } = buildCreateRuleData({
        metadata: { name: 'alert-rule-without-no-data' },
        state_transition: undefined,
      });

      for (const body of [withoutRecovery, withoutNoData]) {
        const response = await apiClient.post(testData.RULE_API_PATH, {
          headers: writerHeaders,
          body,
        });

        expect(response).toHaveStatusCode(400);
        expect(response.body.code).toBe('BAD_REQUEST');
      }
    }
  );

  apiTest('create: returns 201 with a standalone recovery query', async ({ apiClient }) => {
    const body = buildCreateRuleData({
      metadata: { name: 'standalone-recover-rule' },
      recovery: {
        strategy: 'query',
        query:
          'FROM logs-* | WHERE severity == "resolved" | STATS count = COUNT(*) BY host.name | WHERE count >= 1',
      },
      query: {
        base: 'FROM logs-* | WHERE severity == "high" | STATS count = COUNT(*) BY host.name | WHERE count >= 1',
      },
    });
    const response = await apiClient.post(testData.RULE_API_PATH, {
      headers: writerHeaders,
      body,
    });
    expect(response).toHaveStatusCode(201);
    expect(response.body.query).toStrictEqual(body.query);
    expect(response.body.recovery).toStrictEqual(body.recovery);
  });

  apiTest('create: returns 201 with recovery strategy "no_breach"', async ({ apiClient }) => {
    const body = buildCreateRuleData({
      metadata: { name: 'no-breach-recovery' },
      recovery: { strategy: 'no_breach' },
      query: { base: 'FROM logs-* | LIMIT 1' },
    });
    const response = await apiClient.post(testData.RULE_API_PATH, {
      headers: writerHeaders,
      body,
    });
    expect(response).toHaveStatusCode(201);
    expect(response.body.recovery).toStrictEqual({ strategy: 'no_breach' });
  });

  apiTest('create: returns 201 with recovery strategy "manual"', async ({ apiClient }) => {
    const body = buildCreateRuleData({
      metadata: { name: 'manual-recovery' },
      recovery: { strategy: 'manual' },
      query: { base: 'FROM logs-* | LIMIT 1' },
    });
    const response = await apiClient.post(testData.RULE_API_PATH, {
      headers: writerHeaders,
      body,
    });
    expect(response).toHaveStatusCode(201);
    expect(response.body.recovery).toStrictEqual({ strategy: 'manual' });
  });

  apiTest('create: returns 201 with a no_data presence query', async ({ apiClient }) => {
    const body = buildCreateRuleData({
      metadata: { name: 'no-data-presence-rule' },
      no_data: {
        strategy: 'keep_last',
        query: 'FROM logs-* | STATS c = COUNT(*) | WHERE c == 0',
      },
      query: { base: 'FROM logs-* | LIMIT 1' },
    });
    const response = await apiClient.post(testData.RULE_API_PATH, {
      headers: writerHeaders,
      body,
    });
    expect(response).toHaveStatusCode(201);
    expect(response.body.query).toStrictEqual(body.query);
    expect(response.body.no_data).toStrictEqual(body.no_data);
  });

  for (const strategy of ['ignore', 'keep_last', 'resolve', 'alert'] as const) {
    apiTest(`create: returns 201 with no_data strategy "${strategy}"`, async ({ apiClient }) => {
      const body = buildCreateRuleData({
        metadata: { name: `no-data-${strategy}-rule` },
        no_data: { strategy },
        query: { base: 'FROM logs-* | LIMIT 1' },
      });
      const response = await apiClient.post(testData.RULE_API_PATH, {
        headers: writerHeaders,
        body,
      });
      expect(response).toHaveStatusCode(201);
      expect(response.body.no_data).toStrictEqual({ strategy });
    });
  }

  apiTest('create: returns 201 with a breach segment', async ({ apiClient }) => {
    const body = buildCreateRuleData({
      metadata: { name: 'composed-rule' },
      query: {
        base: 'FROM logs-* | STATS count = COUNT(*) BY host.name',
        breach: { segment: 'WHERE count >= 10' },
      },
    });
    const response = await apiClient.post(testData.RULE_API_PATH, {
      headers: writerHeaders,
      body,
    });
    expect(response).toHaveStatusCode(201);
    expect(response.body.query).toStrictEqual(body.query);
  });

  apiTest(
    'create: persists a conditionless rule without a breach block',
    async ({ apiClient, apiServices }) => {
      const body = buildCreateRuleData({
        metadata: { name: 'conditionless-rule' },
        query: { base: 'FROM logs-* | STATS count = COUNT(*) BY host.name' },
      });

      const response = await apiClient.post(testData.RULE_API_PATH, {
        headers: writerHeaders,
        body,
      });

      expect(response).toHaveStatusCode(201);
      expect(response.body.query).toStrictEqual(body.query);

      const persisted = await apiServices.alertingV2.rules.get(response.body.id);
      expect(persisted.query).toStrictEqual(body.query);
    }
  );

  apiTest('create: returns 201 with a recovery condition segment', async ({ apiClient }) => {
    const body = buildCreateRuleData({
      metadata: { name: 'condition-recover-rule' },
      recovery: { strategy: 'condition', segment: 'WHERE max_val < 5' },
      query: {
        base: 'FROM logs-* | STATS max_val = MAX(value) BY host.name',
        breach: { segment: 'WHERE max_val >= 10' },
      },
    });
    const response = await apiClient.post(testData.RULE_API_PATH, {
      headers: writerHeaders,
      body,
    });
    expect(response).toHaveStatusCode(201);
    expect(response.body.query).toStrictEqual(body.query);
    expect(response.body.recovery).toStrictEqual(body.recovery);
  });

  apiTest(
    'create: returns 201 with a breach segment and a no_data strategy',
    async ({ apiClient }) => {
      const body = buildCreateRuleData({
        metadata: { name: 'composed-no-data-rule' },
        no_data: { strategy: 'keep_last' },
        query: {
          base: 'FROM logs-* | STATS count = COUNT(*) BY host.name',
          breach: { segment: 'WHERE count >= 1' },
        },
      });
      const response = await apiClient.post(testData.RULE_API_PATH, {
        headers: writerHeaders,
        body,
      });
      expect(response).toHaveStatusCode(201);
      expect(response.body.no_data).toStrictEqual({ strategy: 'keep_last' });
    }
  );

  apiTest('validation: rejects body with missing kind', async ({ apiClient }) => {
    const { kind: _kind, ...rest } = buildCreateRuleData({ metadata: { name: 'no-kind' } });
    const response = await apiClient.post(testData.RULE_API_PATH, {
      headers: writerHeaders,
      body: rest,
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: rejects body with missing schedule', async ({ apiClient }) => {
    const { schedule: _schedule, ...rest } = buildCreateRuleData({
      metadata: { name: 'no-schedule' },
    });
    const response = await apiClient.post(testData.RULE_API_PATH, {
      headers: writerHeaders,
      body: rest,
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: rejects body with missing query', async ({ apiClient }) => {
    const { query: _query, ...rest } = buildCreateRuleData({
      metadata: { name: 'no-query' },
    });
    const response = await apiClient.post(testData.RULE_API_PATH, {
      headers: writerHeaders,
      body: rest,
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest(
    'authorization: returns 201 for a user with full alerting_v2 privileges',
    async ({ apiClient }) => {
      const body = buildCreateRuleData({ metadata: { name: 'writer-can-create' } });
      const response = await apiClient.post(testData.RULE_API_PATH, {
        headers: writerHeaders,
        body,
      });
      expect(response).toHaveStatusCode(201);
    }
  );

  apiTest(
    'authorization: returns 403 for a user with read-only alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_RULES_READ_ROLE
      );
      const body = buildCreateRuleData({ metadata: { name: 'reader-cannot-create' } });
      const response = await apiClient.post(testData.RULE_API_PATH, {
        headers: { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader },
        body,
      });
      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest(
    'authorization: returns 403 for a user without alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
      const body = buildCreateRuleData({ metadata: { name: 'noaccess-cannot-create' } });
      const response = await apiClient.post(testData.RULE_API_PATH, {
        headers: { ...testData.COMMON_HEADERS, ...noAccessCredentials.apiKeyHeader },
        body,
      });
      expect(response).toHaveStatusCode(403);
    }
  );
});
