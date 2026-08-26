/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MOCK_IDP_UIAM_ORG_ADMIN_API_KEY } from '@kbn/mock-idp-utils';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { COMMON_HEADERS, ES_QUERY_RULE_PARAMS } from '../../../scout/api/fixtures/constants';
import { waitForSuccessfulEventLogEntry } from '../../../scout/api/lib/wait_for_successful_event_log';

const ORG_KEY_HEADERS = {
  ...COMMON_HEADERS,
  Authorization: `ApiKey ${MOCK_IDP_UIAM_ORG_ADMIN_API_KEY}`,
};

const getRuleBody = (name: string, enabled: boolean) => ({
  name,
  rule_type_id: '.es-query',
  consumer: 'alerts',
  enabled,
  schedule: { interval: '1m' },
  actions: [],
  params: ES_QUERY_RULE_PARAMS,
});

// These tests cannot be run on MKI because they rely on the Mock IdP UIAM setup.
apiTest.describe(
  '[NON-MKI] Rule operations with an organization-level UIAM API key',
  { tag: tags.serverless.all },
  () => {
    const createdRuleIds: string[] = [];

    apiTest.afterAll(async ({ apiClient }) => {
      for (const ruleId of createdRuleIds) {
        await apiClient.delete(`api/alerting/rule/${ruleId}`, {
          headers: ORG_KEY_HEADERS,
        });
      }
    });

    apiTest(
      'creating an enabled rule reuses the raw key as a user-managed key',
      async ({ apiClient }) => {
        // A user-created Cloud API key is presented as the raw `essu_` secret with no key id.
        // It is stored on the rule as-is and marked user-managed: alerting mints no new keys
        // and never invalidates it — lifecycle management remains the user's responsibility.
        const response = await apiClient.post('api/alerting/rule', {
          headers: ORG_KEY_HEADERS,
          responseType: 'json',
          body: getRuleBody('org-level-key-enabled-rule', true),
        });

        expect(response).toHaveStatusCode(200);
        createdRuleIds.push(response.body.id);
        expect(response.body.api_key_created_by_user).toBe(true);

        // Persistence alone would still pass if execution regressed to the authentication
        // failure this PR fixes (presenting an external key with the UIAM shared secret), so
        // verify the rule actually runs successfully with the raw key.
        await waitForSuccessfulEventLogEntry(apiClient, response.body.id, ORG_KEY_HEADERS);
      }
    );

    apiTest(
      'creating a disabled rule and enabling it afterwards succeeds',
      async ({ apiClient }) => {
        // No rule API key is resolved for disabled rules; the key is captured on enable.
        const createResponse = await apiClient.post('api/alerting/rule', {
          headers: ORG_KEY_HEADERS,
          responseType: 'json',
          body: getRuleBody('org-level-key-disabled-rule', false),
        });

        expect(createResponse).toHaveStatusCode(200);
        const ruleId = createResponse.body.id;
        createdRuleIds.push(ruleId);

        const enableResponse = await apiClient.post(`api/alerting/rule/${ruleId}/_enable`, {
          headers: ORG_KEY_HEADERS,
          responseType: 'json',
        });

        expect(enableResponse).toHaveStatusCode(204);

        // The enable path reuses the caller's raw key and marks the rule user-managed.
        const getResponse = await apiClient.get(`api/alerting/rule/${ruleId}`, {
          headers: ORG_KEY_HEADERS,
          responseType: 'json',
        });

        expect(getResponse).toHaveStatusCode(200);
        expect(getResponse.body.enabled).toBe(true);
        expect(getResponse.body.api_key_created_by_user).toBe(true);

        // The enable path snapshots the raw key onto the rule; prove it authenticates at run time.
        await waitForSuccessfulEventLogEntry(apiClient, ruleId, ORG_KEY_HEADERS);
      }
    );
  }
);
