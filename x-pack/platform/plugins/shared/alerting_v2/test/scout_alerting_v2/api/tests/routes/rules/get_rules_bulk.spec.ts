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
  ALL_ROLE,
  apiTest,
  buildCreateRuleData,
  NO_ACCESS_ROLE,
  READ_ROLE,
  testData,
} from '../../../fixtures';

const BULK_URL = `${testData.RULE_API_PATH}/_bulk`;

/**
 * The route's Zod schema declares `ids.array.max(1000)`, but that validation
 * rule is unreachable via HTTP: Hapi parses query strings with `qs`, whose
 * default `parameterLimit` is also 1000. Repeated query params beyond that
 * limit are silently dropped before validation runs, so the server never sees
 * more than 1000 ids.
 *
 * See https://github.com/ljharb/qs/issues/376 and the upstream Express thread
 * https://github.com/expressjs/express/issues/5878.
 */
const QS_PARAMETER_LIMIT = 1000;

/**
 * Build a `?ids=…&ids=…` query string using URLSearchParams so each id is
 * URL-encoded correctly and repeated params (the array form) are produced
 * without manual string concatenation.
 */
const getBulkUrl = (ids: string[] | string): string => {
  const search = new URLSearchParams();
  const list = Array.isArray(ids) ? ids : [ids];
  for (const id of list) {
    search.append('ids', id);
  }
  const qs = search.toString();
  return qs ? `${BULK_URL}?${qs}` : BULK_URL;
};

apiTest.describe('Get rules bulk API', { tag: '@local-stateful-classic' }, () => {
  let readerCredentials: RoleApiCredentials;
  let readerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    readerCredentials = await requestAuth.getApiKeyForCustomRole(READ_ROLE);
    readerHeaders = { ...readerCredentials.apiKeyHeader };
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
  });

  apiTest(
    'bulk: should return the requested rules when given multiple ids',
    async ({ apiClient, apiServices }) => {
      const ruleA = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-a' } })
      );
      const ruleB = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-b' } })
      );
      // Seed a third rule that is NOT requested to confirm the endpoint does
      // not leak unrelated rules into the response.
      await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'rule-c' } })
      );
      const response = await apiClient.get(getBulkUrl([ruleA.id, ruleB.id]), {
        headers: readerHeaders,
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({
        total: 2,
        page: 1,
        perPage: 2,
      });
      const returnedIds = response.body.items.map((rule: { id: string }) => rule.id);
      expect(returnedIds.sort()).toStrictEqual([ruleA.id, ruleB.id].sort());
    }
  );

  apiTest(
    'bulk: should return a single rule when given a single id',
    async ({ apiClient, apiServices }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'single-rule' } })
      );
      const response = await apiClient.get(getBulkUrl(rule.id), {
        headers: readerHeaders,
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.total).toBe(1);
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].id).toBe(rule.id);
    }
  );

  apiTest(
    'bulk: should silently drop ids that do not exist',
    async ({ apiClient, apiServices }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'existing-rule' } })
      );
      const response = await apiClient.get(getBulkUrl([rule.id, 'does-not-exist']), {
        headers: readerHeaders,
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.total).toBe(1);
      expect(response.body.items.map((r: { id: string }) => r.id)).toStrictEqual([rule.id]);
    }
  );

  apiTest(
    'bulk: should return an empty result set when none of the ids exist',
    async ({ apiClient }) => {
      const response = await apiClient.get(getBulkUrl(['missing-1', 'missing-2']), {
        headers: readerHeaders,
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({
        total: 0,
        page: 1,
        perPage: 0,
      });
      expect(response.body.items).toStrictEqual([]);
    }
  );

  apiTest(
    'bulk: should treat a missing ids query param as an empty request',
    async ({ apiClient }) => {
      const response = await apiClient.get(BULK_URL, {
        headers: readerHeaders,
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({
        total: 0,
        page: 1,
        perPage: 0,
      });
      expect(response.body.items).toStrictEqual([]);
    }
  );

  apiTest('validation: should reject ids longer than ID_MAX_LENGTH', async ({ apiClient }) => {
    const tooLongId = 'a'.repeat(ID_MAX_LENGTH + 1);
    const response = await apiClient.get(getBulkUrl([tooLongId]), {
      headers: readerHeaders,
    });
    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'bulk: documents that ids past the qs parameter limit are silently dropped',
    async ({ apiClient }) => {
      // We send `QS_PARAMETER_LIMIT + 1` ids that resolve to no rules (the
      // index is empty thanks to cleanUp). The route would return 400 if Zod's
      // .max(1000) was actually reached, but qs truncates first, so we
      // observe 200 with an empty items array and total === 0.
      const ids = Array.from({ length: QS_PARAMETER_LIMIT + 1 }, (_, i) => `id-${i}`);
      const response = await apiClient.get(getBulkUrl(ids), {
        headers: readerHeaders,
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.items).toStrictEqual([]);
      expect(response.body.total).toBe(0);
    }
  );

  apiTest(
    'authorization: should return 200 for a user with read-only alerting_v2 privileges',
    async ({ apiClient, apiServices }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'visible-to-readers' } })
      );
      const response = await apiClient.get(getBulkUrl(rule.id), {
        headers: readerHeaders,
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.items[0].id).toBe(rule.id);
    }
  );

  apiTest(
    'authorization: should return 200 for a user with full alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'visible-to-writers' } })
      );
      const writerCredentials = await requestAuth.getApiKeyForCustomRole(ALL_ROLE);
      const response = await apiClient.get(getBulkUrl(rule.id), {
        headers: writerCredentials.apiKeyHeader,
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.items[0].id).toBe(rule.id);
    }
  );

  apiTest(
    'authorization: should return 403 for a user without alerting_v2 privileges',
    async ({ apiClient, apiServices, requestAuth }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({ metadata: { name: 'hidden-rule' } })
      );
      const noAccessCredentials = await requestAuth.getApiKeyForCustomRole(NO_ACCESS_ROLE);
      const response = await apiClient.get(getBulkUrl(rule.id), {
        headers: noAccessCredentials.apiKeyHeader,
      });
      expect(response).toHaveStatusCode(403);
    }
  );
});
