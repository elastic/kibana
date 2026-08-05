/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * End-to-end contract for the alerting v2 error envelope.
 *
 * Every alerting v2 route funnels its errors through
 * `BaseAlertingRoute.onError`, which serializes them to the flat
 * `{ code, error, message, details? }` shape declared by `errorResponseSchema`
 * and sets `bypassErrorFormat: true` so Kibana core sends that body verbatim.
 *
 * Because the serialization is centralized, one representative route is enough
 * to prove the wire shape for all of them: we drive a `RULE_NOT_FOUND` 404
 * (it carries both a stable `code` and structured `details`) and assert the
 * envelope survives to the client.
 *
 * Per `errorResponseSchema`, only `code` is a stable/contractual value (changing
 * it is a breaking change) and `details` is structured context clients consume
 * programmatically. `error` and `message` are documented as "subject to change
 * without notice", so we assert their presence and type but never their wording.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import { ALERTING_V2_RULES_READ_ROLE, apiTest, getRuleUrl } from '../fixtures';

apiTest.describe('Alerting v2 error response contract', { tag: '@local-stateful-classic' }, () => {
  let readerCredentials: RoleApiCredentials;
  let readerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    readerCredentials = await requestAuth.getApiKeyForCustomRole(ALERTING_V2_RULES_READ_ROLE);
    readerHeaders = { ...readerCredentials.apiKeyHeader };
  });

  apiTest(
    'delivers the flat { code, error, message, details } body verbatim (no Boom re-wrap)',
    async ({ apiClient }) => {
      const missingRuleId = 'error-contract-missing-rule';

      const response = await apiClient.get(getRuleUrl(missingRuleId), {
        headers: readerHeaders,
      });

      expect(response).toHaveStatusCode(404);

      // Only `code` is a stable, machine-readable field: per `errorResponseSchema`,
      // changing its value is a breaking change, so it is the only value we pin.
      expect(response.body.code).toBe('RULE_NOT_FOUND');

      expect(response.body.details).toMatchObject({ rule_id: missingRuleId });

      expect(typeof response.body.error).toBe('string');
      expect(response.body.error.length).toBeGreaterThan(0);
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message.length).toBeGreaterThan(0);

      // `statusCode` is not part of the contract. It is added by Kibana core's
      // `HapiResponseAdapter.toError` method. If there is a bug in our code, it will be present.
      expect(response.body.statusCode).toBeUndefined();
    }
  );
});
