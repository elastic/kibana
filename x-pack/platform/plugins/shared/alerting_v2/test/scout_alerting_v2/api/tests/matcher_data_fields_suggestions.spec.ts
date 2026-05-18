/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import { apiTest, NO_ACCESS_ROLE, READ_ROLE, testData } from '../fixtures';

const RULE_ID_A = 'matcher-suggestions-rule-a';
const RULE_ID_B = 'matcher-suggestions-rule-b';
const DATA_FIELDS_PATH = `${testData.ACTION_POLICY_API_PATH}/suggestions/data_fields`;

const buildAlertEvent = (overrides: {
  ruleId: string;
  data: Record<string, unknown>;
  status?: 'pending' | 'active' | 'recovering' | 'inactive';
}) => ({
  '@timestamp': new Date().toISOString(),
  type: 'alert',
  rule: { id: overrides.ruleId, version: 1 },
  group_hash: `${overrides.ruleId}-group`,
  episode: {
    id: `${overrides.ruleId}-episode`,
    status: overrides.status ?? 'active',
  },
  status: 'breached',
  source: 'test',
  space_id: 'default',
  data: overrides.data,
});

const dataFieldsUrl = (params: { matcher?: string } = {}): string => {
  const search = new URLSearchParams();
  if (params.matcher !== undefined) search.set('matcher', params.matcher);
  const qs = search.toString();
  return qs ? `${DATA_FIELDS_PATH}?${qs}` : DATA_FIELDS_PATH;
};

const seedAlertEvents = async (esClient: EsClient): Promise<void> => {
  await esClient.bulk({
    index: testData.ALERT_EVENTS_DATA_STREAM,
    operations: [
      { create: {} },
      buildAlertEvent({ ruleId: RULE_ID_A, data: { host: 'h1', cpu: 95 } }),
      { create: {} },
      buildAlertEvent({ ruleId: RULE_ID_A, data: { host: 'h2', region: 'us-east' } }),
      { create: {} },
      buildAlertEvent({ ruleId: RULE_ID_B, data: { service: 'svc1', latency: 200 } }),
    ],
    refresh: 'wait_for',
  });
};

/*
 * The authorization tests below use `requestAuth.getApiKeyForCustomRole`, and
 * custom-role auth is not yet supported on Elastic Cloud Hosted. To avoid
 * silent false-positives, the entire suite is restricted to local stateful
 * (classic) until ECH support lands. This matches the find-rules suite.
 */
apiTest.describe('Matcher data fields suggestions API', { tag: '@local-stateful-classic' }, () => {
  let adminCredentials: RoleApiCredentials;
  let adminHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    adminCredentials = await requestAuth.getApiKeyForAdmin();
    adminHeaders = { ...adminCredentials.apiKeyHeader };
  });

  apiTest.beforeEach(async ({ apiServices, esClient }) => {
    await apiServices.alertingV2.ruleEvents.cleanUp();
    await seedAlertEvents(esClient);
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.ruleEvents.cleanUp();
  });

  apiTest(
    'returns the union of data.* field names across all matching alerts when no matcher is given',
    async ({ apiClient }) => {
      const response = await apiClient.get(dataFieldsUrl(), {
        headers: adminHeaders,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual(
        expect.arrayContaining([
          'data.cpu',
          'data.host',
          'data.latency',
          'data.region',
          'data.service',
        ])
      );
    }
  );

  apiTest(
    'narrows fields when matcher selects a single rule via rule.id',
    async ({ apiClient }) => {
      const response = await apiClient.get(dataFieldsUrl({ matcher: `rule.id : "${RULE_ID_A}"` }), {
        headers: adminHeaders,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      // The matcher scopes to documents we seeded for RULE_ID_A, so the
      // result is fully under test control — assert exact equality.
      expect(response.body).toStrictEqual(['data.cpu', 'data.host', 'data.region']);
    }
  );

  apiTest(
    'falls back to the unfiltered result when matcher cannot be parsed',
    async ({ apiClient }) => {
      // Trailing colon makes this an unparseable KQL expression.
      const response = await apiClient.get(dataFieldsUrl({ matcher: 'rule.id :' }), {
        headers: adminHeaders,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual(expect.arrayContaining(['data.host', 'data.service']));
    }
  );

  apiTest(
    'falls back to the unfiltered result when matcher only references dropped fields',
    async ({ apiClient }) => {
      // `rule.name` is intentionally not pushed down to the alert-events
      // query; the AST collapses to no filter and we return everything.
      const response = await apiClient.get(dataFieldsUrl({ matcher: 'rule.name : "anything"' }), {
        headers: adminHeaders,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual(expect.arrayContaining(['data.host', 'data.service']));
    }
  );

  apiTest('validation: rejects empty matcher with a 400', async ({ apiClient }) => {
    const response = await apiClient.get(`${DATA_FIELDS_PATH}?matcher=`, {
      headers: adminHeaders,
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(400);
    expect(response.body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
  });

  apiTest(
    'validation: rejects matcher longer than the schema limit with a 400',
    async ({ apiClient }) => {
      const response = await apiClient.get(dataFieldsUrl({ matcher: 'a'.repeat(2049) }), {
        headers: adminHeaders,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
    }
  );

  apiTest(
    'authorization: returns 200 for a user with read-only privileges',
    async ({ apiClient, requestAuth }) => {
      const readerCredentials = await requestAuth.getApiKeyForCustomRole(READ_ROLE);

      const response = await apiClient.get(dataFieldsUrl(), {
        headers: readerCredentials.apiKeyHeader,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
    }
  );

  apiTest(
    'authorization: returns 403 for a user without alerting_v2 privileges',
    async ({ apiClient, requestAuth }) => {
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);

      const response = await apiClient.get(dataFieldsUrl(), {
        headers: noAccessCredentials.apiKeyHeader,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
