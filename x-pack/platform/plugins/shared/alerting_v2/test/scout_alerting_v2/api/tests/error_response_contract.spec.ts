/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * End-to-end contract for the alerting v2 error envelope.
 *
 * Alerting v2 emits its error envelope through two centralized paths, both of
 * which serialize to the flat `{ code, error, message, details? }` shape
 * declared by `errorResponseSchema` and set `bypassErrorFormat: true` so Kibana
 * core sends that body verbatim:
 *
 *  - Domain errors thrown by handlers funnel through `BaseAlertingRoute.onError`.
 *  - Request schema-validation failures — which Kibana core owns and raises
 *    before the handler runs — funnel through
 *    `BaseAlertingRoute.onRequestValidationError`, wired via the route's
 *    `validate.onRequestValidationError` hook.
 *
 * Because both serializations are centralized, one representative route per path
 * is enough to prove the wire shape for all of them:
 *  - a `RULE_NOT_FOUND` 404 (carries a stable `code` and structured `details`),
 *  - a create-rule 400 with a missing required field (schema validation).
 *
 * Per `errorResponseSchema`, only `code` is a stable/contractual value (changing
 * it is a breaking change) and `details` is structured context clients consume
 * programmatically. `error` and `message` are documented as "subject to change
 * without notice", so we assert their presence and type but never their wording.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import {
  ALERTING_V2_RULES_ALL_ROLE,
  ALERTING_V2_RULES_READ_ROLE,
  apiTest,
  buildCreateRuleData,
  getRuleUrl,
  testData,
} from '../fixtures';

apiTest.describe('Alerting v2 error response contract', { tag: '@local-stateful-classic' }, () => {
  let readerCredentials: RoleApiCredentials;
  let readerHeaders: Record<string, string>;
  let writerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    readerCredentials = await requestAuth.getApiKeyForCustomRole(ALERTING_V2_RULES_READ_ROLE);
    readerHeaders = { ...readerCredentials.apiKeyHeader };

    const writerCredentials = await requestAuth.getApiKeyForCustomRole(ALERTING_V2_RULES_ALL_ROLE);
    writerHeaders = { ...testData.COMMON_HEADERS, ...writerCredentials.apiKeyHeader };
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

  apiTest(
    'maps request schema-validation failures to the same flat error envelope',
    async ({ apiClient }) => {
      const body = buildCreateRuleData();
      const invalidBody = { ...body, metadata: { description: 'no name here' } };

      const response = await apiClient.post(testData.RULE_API_PATH, {
        headers: writerHeaders,
        body: invalidBody,
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
      expect(response.body.details).toMatchObject({ source: 'body' });
      expect(response.body.statusCode).toBeUndefined();
    }
  );
});
