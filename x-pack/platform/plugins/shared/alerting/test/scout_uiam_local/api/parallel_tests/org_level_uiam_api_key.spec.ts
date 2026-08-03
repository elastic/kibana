/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MOCK_IDP_UIAM_ORG_ADMIN_API_KEY } from '@kbn/mock-idp-utils';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

const COMMON_HEADERS = {
  'Content-Type': 'application/json;charset=UTF-8',
  'kbn-xsrf': 'some-xsrf-token',
};

const getRuleBody = (name: string, enabled: boolean) => ({
  name,
  rule_type_id: '.es-query',
  consumer: 'alerts',
  enabled,
  schedule: { interval: '1m' },
  actions: [],
  params: {
    searchType: 'esQuery',
    esQuery: '{"query":{"match_all":{}}}',
    index: ['alerting-test-index'],
    timeField: '@timestamp',
    threshold: [0],
    thresholdComparator: '>',
    size: 10,
    timeWindowSize: 5,
    timeWindowUnit: 'm',
  },
});

// These tests cannot be run on MKI because they rely on the Mock IdP UIAM setup.
apiTest.describe(
  '[NON-MKI] Rule operations with an organization-level UIAM API key',
  { tag: tags.serverless.all },
  () => {
    apiTest(
      'creating an enabled rule fails with a clear 400 instead of a parse error',
      async ({ apiClient }) => {
        // An organization-level key is presented as the raw `essu_` secret. It carries no key id,
        // so the "reuse the caller's key" path cannot persist it on the rule and must reject it
        // with an actionable message.
        const response = await apiClient.post('api/alerting/rule', {
          headers: {
            ...COMMON_HEADERS,
            Authorization: `ApiKey ${MOCK_IDP_UIAM_ORG_ADMIN_API_KEY}`,
          },
          responseType: 'json',
          body: getRuleBody('org-level-key-enabled-rule', true),
        });

        expect(response).toHaveStatusCode(400);
        expect(response.body.message).toContain(
          'Organization-level API keys are not supported for rule operations'
        );
      }
    );

    apiTest(
      'creating a disabled rule succeeds (no rule API key is resolved for disabled rules)',
      async ({ apiClient }) => {
        const createResponse = await apiClient.post('api/alerting/rule', {
          headers: {
            ...COMMON_HEADERS,
            Authorization: `ApiKey ${MOCK_IDP_UIAM_ORG_ADMIN_API_KEY}`,
          },
          responseType: 'json',
          body: getRuleBody('org-level-key-disabled-rule', false),
        });

        expect(createResponse).toHaveStatusCode(200);
        const ruleId = createResponse.body.id;

        // Enabling the rule afterwards resolves an API key and must fail with the same clear 400.
        const enableResponse = await apiClient.post(`api/alerting/rule/${ruleId}/_enable`, {
          headers: {
            ...COMMON_HEADERS,
            Authorization: `ApiKey ${MOCK_IDP_UIAM_ORG_ADMIN_API_KEY}`,
          },
          responseType: 'json',
        });

        expect(enableResponse).toHaveStatusCode(400);
        expect(enableResponse.body.message).toContain(
          'Organization-level API keys are not supported for rule operations'
        );

        // Cleanup — deleting a disabled rule does not touch the API key path.
        const deleteResponse = await apiClient.delete(`api/alerting/rule/${ruleId}`, {
          headers: {
            ...COMMON_HEADERS,
            Authorization: `ApiKey ${MOCK_IDP_UIAM_ORG_ADMIN_API_KEY}`,
          },
        });
        expect(deleteResponse).toHaveStatusCode(204);
      }
    );
  }
);
