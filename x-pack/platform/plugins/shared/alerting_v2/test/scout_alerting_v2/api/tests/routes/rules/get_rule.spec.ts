/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import { ID_MAX_LENGTH } from '@kbn/alerting-v2-schemas';
import {
  ALERTING_V2_RULES_ALL_ROLE,
  ALERTING_V2_RULES_READ_ROLE,
  apiTest,
  buildCreateRuleData,
  getRuleUrl,
  NO_ACCESS_ROLE,
} from '../../../fixtures';

apiTest.describe('Get rule API', { tag: '@local-stateful-classic' }, () => {
  let readerCredentials: RoleApiCredentials;
  let readerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    readerCredentials = await requestAuth.getApiKeyForCustomRole(ALERTING_V2_RULES_READ_ROLE);
    readerHeaders = { ...readerCredentials.apiKeyHeader };
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
  });

  apiTest(
    'get: should return the rule with the expected response shape',
    async ({ apiClient, apiServices }) => {
      const createData = buildCreateRuleData({
        metadata: {
          name: 'rule-to-fetch',
          description: 'fetched by id',
          tags: ['cpu'],
        },
      });
      const created = await apiServices.alertingV2.rules.create(createData);
      const response = await apiClient.get(getRuleUrl(created.id), {
        headers: readerHeaders,
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual(created);
    }
  );

  apiTest('status: should return 404 when the rule does not exist', async ({ apiClient }) => {
    const response = await apiClient.get(getRuleUrl('does-not-exist'), {
      headers: readerHeaders,
    });
    expect(response).toHaveStatusCode(404);
  });

  apiTest(
    'validation: should reject ids longer than ID_MAX_LENGTH with a 400',
    async ({ apiClient }) => {
      const tooLongId = 'a'.repeat(ID_MAX_LENGTH + 1);
      const response = await apiClient.get(getRuleUrl(tooLongId), {
        headers: readerHeaders,
      });
      expect(response).toHaveStatusCode(400);
    }
  );

  apiTest(
    'authorization: should return 200 for a user with read-only alerting_v2 privileges',
    async ({ apiClient, apiServices }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'visible-to-readers' } })
      );
      const response = await apiClient.get(getRuleUrl(created.id), {
        headers: readerHeaders,
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.id).toBe(created.id);
    }
  );

  apiTest(
    'authorization: should return 200 for a user with full alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'visible-to-writers' } })
      );
      const writerCredentials = await requestAuth.getApiKeyForCustomRole(
        ALERTING_V2_RULES_ALL_ROLE
      );
      const response = await apiClient.get(getRuleUrl(created.id), {
        headers: writerCredentials.apiKeyHeader,
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.id).toBe(created.id);
    }
  );

  apiTest(
    'authorization: should return 403 for a user without alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const created = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'hidden-rule' } })
      );
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
      const response = await apiClient.get(getRuleUrl(created.id), {
        headers: noAccessCredentials.apiKeyHeader,
      });
      expect(response).toHaveStatusCode(403);
    }
  );
});
