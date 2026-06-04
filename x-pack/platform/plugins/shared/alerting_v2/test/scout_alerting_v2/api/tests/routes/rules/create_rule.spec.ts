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
} from '../../../fixtures';

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
      expect(response.body.metadata).toStrictEqual(body.metadata);
      expect(response.body.schedule).toStrictEqual(body.schedule);
      expect(response.body.evaluation).toStrictEqual(body.evaluation);

      const persisted = await apiServices.alertingV2.rules.get(response.body.id);
      expect(persisted.id).toBe(response.body.id);
      expect(persisted.metadata.name).toBe('created-rule');
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
    }
  );

  apiTest('validation: rejects body with missing metadata', async ({ apiClient }) => {
    const { metadata: _metadata, ...rest } = buildCreateRuleData();
    const response = await apiClient.post(testData.RULE_API_PATH, {
      headers: writerHeaders,
      body: rest,
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects body with empty metadata.name', async ({ apiClient }) => {
    const body = buildCreateRuleData({ metadata: { name: '' } });
    const response = await apiClient.post(testData.RULE_API_PATH, {
      headers: writerHeaders,
      body,
    });
    expect(response).toHaveStatusCode(400);
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
    }
  );

  apiTest('validation: rejects body with an unknown kind value', async ({ apiClient }) => {
    const body = { ...buildCreateRuleData(), kind: 'unknown' };
    const response = await apiClient.post(testData.RULE_API_PATH, {
      headers: writerHeaders,
      body,
    });
    expect(response).toHaveStatusCode(400);
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
    }
  );

  apiTest('validation: rejects body with empty evaluation.query.base', async ({ apiClient }) => {
    const body = buildCreateRuleData({ evaluation: { query: { base: '' } } });
    const response = await apiClient.post(testData.RULE_API_PATH, {
      headers: writerHeaders,
      body,
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest('validation: rejects state_transition for non-alert kinds', async ({ apiClient }) => {
    const body = buildCreateRuleData({
      kind: 'signal',
      state_transition: { pending_count: 3, pending_timeframe: '5m' },
    });
    const response = await apiClient.post(testData.RULE_API_PATH, {
      headers: writerHeaders,
      body,
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'validation: rejects recovery_policy.type "query" without a recovery query',
    async ({ apiClient }) => {
      const body = buildCreateRuleData({
        recovery_policy: { type: 'query' },
      });
      const response = await apiClient.post(testData.RULE_API_PATH, {
        headers: writerHeaders,
        body,
      });
      expect(response).toHaveStatusCode(400);
    }
  );

  apiTest(
    'create: returns 201 with the signal kind round-tripped to the response',
    async ({ apiClient, apiServices }) => {
      // Signal rules must opt out of the default `state_transition`,
      // which the schema only allows for `kind: 'alert'`.
      const body = buildCreateRuleData({
        kind: 'signal',
        state_transition: undefined,
        metadata: { name: 'created-signal-rule' },
      });
      const response = await apiClient.post(testData.RULE_API_PATH, {
        headers: writerHeaders,
        body,
      });
      expect(response).toHaveStatusCode(201);
      expect(response.body.kind).toBe('signal');
      expect(response.body.metadata.name).toBe('created-signal-rule');

      const persisted = await apiServices.alertingV2.rules.get(response.body.id);
      expect(persisted.kind).toBe('signal');
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
        evaluation: {
          query: { base: 'FROM logs-* | LIMIT 10 | WHERE status == "error"' },
        },
        recovery_policy: { type: 'no_breach' },
        state_transition: { pending_count: 3 },
        grouping: { fields: ['host.name'] },
        no_data: { behavior: 'recover', timeframe: '15m' },
      });
      const response = await apiClient.post(testData.RULE_API_PATH, {
        headers: writerHeaders,
        body,
      });
      expect(response).toHaveStatusCode(201);
      expect(response.body.metadata).toStrictEqual(body.metadata);
      expect(response.body.schedule).toStrictEqual(body.schedule);
      expect(response.body.evaluation).toStrictEqual(body.evaluation);
      expect(response.body.recovery_policy).toStrictEqual(body.recovery_policy);
      expect(response.body.state_transition).toStrictEqual(body.state_transition);
      expect(response.body.grouping).toStrictEqual(body.grouping);
      expect(response.body.no_data).toStrictEqual(body.no_data);

      const persisted = await apiServices.alertingV2.rules.get(response.body.id);
      expect(persisted.recovery_policy).toStrictEqual(body.recovery_policy);
      expect(persisted.grouping).toStrictEqual(body.grouping);
    }
  );

  apiTest('validation: rejects body with missing kind', async ({ apiClient }) => {
    const { kind: _kind, ...rest } = buildCreateRuleData({ metadata: { name: 'no-kind' } });
    const response = await apiClient.post(testData.RULE_API_PATH, {
      headers: writerHeaders,
      body: rest,
    });
    expect(response).toHaveStatusCode(400);
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
  });

  apiTest('validation: rejects body with missing evaluation', async ({ apiClient }) => {
    const { evaluation: _evaluation, ...rest } = buildCreateRuleData({
      metadata: { name: 'no-evaluation' },
    });
    const response = await apiClient.post(testData.RULE_API_PATH, {
      headers: writerHeaders,
      body: rest,
    });
    expect(response).toHaveStatusCode(400);
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
