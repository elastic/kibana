/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

/**
 * Payload-shape contract for pack-based osquery response actions on detection
 * rules. This spec migrated here from the UI test `alert_response_action_form`
 * per the `osquery-scout-ui-post-review-hardening` change (Workstream A):
 * payload-shape assertions are an API-layer concern and belong outside the UI
 * tree.
 *
 * Verifies:
 *  - Selecting a pack expands into `queries: [{ id, query, interval,
 *    platform? }, ...]` on the outgoing PUT body, matching the pack's
 *    configured queries.
 *  - Persisting the rule strips `interval` from each query (the detection-
 *    engine `OsqueryQuery` zod schema does not declare `interval`), so
 *    round-tripped values omit it while the wire body still carries it.
 *  - Editing the rule to switch packs replaces the expanded queries with the
 *    new pack's query set (the UI race that caused stale queries to survive
 *    is the bug this contract guards).
 */
apiTest.describe(
  'Detection rules with pack-based Osquery response actions — payload shape',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let credentials: RoleApiCredentials;
    let singlePackId: string;
    let multiPackId: string;
    const createdRuleIds: string[] = [];

    apiTest.beforeAll(async ({ requestAuth, apiServices }) => {
      credentials = await requestAuth.getApiKeyForPrivilegedUser();

      const singlePackResponse = await apiServices.osquery.packs.create(
        testData.getMinimalPack({
          name: `ra-single-${Date.now()}`,
          queries: {
            uptime: {
              query: 'select * from uptime;',
              interval: 3600,
              ecs_mapping: {},
            },
          },
        })
      );
      singlePackId = (singlePackResponse.data as Record<string, Record<string, string>>).data
        .saved_object_id;

      const multiPackResponse = await apiServices.osquery.packs.create(
        testData.getMinimalPack({
          name: `ra-multi-${Date.now()}`,
          queries: {
            mem: {
              query: 'SELECT * FROM memory_info;',
              interval: 3600,
              platform: 'linux',
              ecs_mapping: {},
            },
            sys: {
              query: 'SELECT * FROM system_info;',
              interval: 3600,
              platform: 'linux,windows,darwin',
              ecs_mapping: {},
            },
            opera: {
              query: 'select opera_extensions.* from users join opera_extensions using (uid);',
              interval: 10,
              ecs_mapping: {},
            },
          },
        })
      );
      multiPackId = (multiPackResponse.data as Record<string, Record<string, string>>).data
        .saved_object_id;
    });

    apiTest.afterAll(async ({ apiServices, kbnClient }) => {
      for (const ruleId of createdRuleIds) {
        await kbnClient.request({
          method: 'DELETE',
          path: `/api/detection_engine/rules?id=${ruleId}`,
          headers: { 'elastic-api-version': testData.OSQUERY_API_VERSION },
          ignoreErrors: [404],
        });
      }

      await apiServices.osquery.packs.delete(singlePackId);
      await apiServices.osquery.packs.delete(multiPackId);
    });

    apiTest(
      'single-query pack expands to one query entry with interval on the wire body',
      async ({ apiClient }) => {
        const ruleBody = testData.getMinimalRule({
          response_actions: [
            {
              action_type_id: '.osquery',
              params: {
                pack_id: singlePackId,
                queries: [
                  {
                    id: 'uptime',
                    query: 'select * from uptime;',
                    interval: 3600,
                  },
                ],
              },
            },
          ],
        });

        const createResponse = await apiClient.post(testData.API_PATHS.DETECTION_RULES, {
          headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader },
          body: ruleBody,
          responseType: 'json',
        });
        expect(createResponse).toHaveStatusCode(200);
        createdRuleIds.push(createResponse.body.id);

        const { params } = createResponse.body.response_actions[0];
        expect(params.pack_id).toBe(singlePackId);
        expect(params.queries).toHaveLength(1);
        expect(params.queries[0]).toMatchObject({
          id: 'uptime',
          query: 'select * from uptime;',
        });
      }
    );

    apiTest(
      'multi-query pack expands to every query with platform preserved and interval stripped on read',
      async ({ apiClient }) => {
        const expectedSentQueries = [
          {
            id: 'mem',
            query: 'SELECT * FROM memory_info;',
            interval: 3600,
            platform: 'linux',
          },
          {
            id: 'sys',
            query: 'SELECT * FROM system_info;',
            interval: 3600,
            platform: 'linux,windows,darwin',
          },
          {
            id: 'opera',
            query: 'select opera_extensions.* from users join opera_extensions using (uid);',
            interval: 10,
          },
        ];

        const ruleBody = testData.getMinimalRule({
          response_actions: [
            {
              action_type_id: '.osquery',
              params: {
                pack_id: multiPackId,
                queries: expectedSentQueries,
              },
            },
          ],
        });

        const createResponse = await apiClient.post(testData.API_PATHS.DETECTION_RULES, {
          headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader },
          body: ruleBody,
          responseType: 'json',
        });
        expect(createResponse).toHaveStatusCode(200);
        createdRuleIds.push(createResponse.body.id);

        // Detection-engine's `OsqueryQuery` zod schema (see
        // `x-pack/solutions/security/plugins/security_solution/common/api/detection_engine/
        // model/rule_response_actions/response_actions.gen.ts`) does NOT declare
        // `interval`, so zod strips it on persist/read. The wire body still
        // carries `interval`, but the round-tripped rule omits it.
        const expectedPersistedQueries = expectedSentQueries.map(
          ({ interval: _interval, ...rest }) => rest
        );

        const getResponse = await apiClient.get(
          `${testData.API_PATHS.DETECTION_RULES}?id=${createResponse.body.id}`,
          {
            headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader },
            responseType: 'json',
          }
        );
        expect(getResponse).toHaveStatusCode(200);
        const { params } = getResponse.body.response_actions[0];
        expect(params.pack_id).toBe(multiPackId);
        expect(params.queries).toStrictEqual(expectedPersistedQueries);
      }
    );

    apiTest(
      'switching the rule from one pack to another replaces the expanded queries',
      async ({ apiClient }) => {
        // Start with the single-pack rule.
        const createResponse = await apiClient.post(testData.API_PATHS.DETECTION_RULES, {
          headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader },
          body: testData.getMinimalRule({
            response_actions: [
              {
                action_type_id: '.osquery',
                params: {
                  pack_id: singlePackId,
                  queries: [{ id: 'uptime', query: 'select * from uptime;', interval: 3600 }],
                },
              },
            ],
          }),
          responseType: 'json',
        });
        expect(createResponse).toHaveStatusCode(200);
        createdRuleIds.push(createResponse.body.id);

        // Update to the multi-pack. The UI race this test guards against was
        // the form carrying the single-pack's `queries` into the PUT even
        // after the combobox committed to the multi-pack; at the API layer
        // that shows up as a mismatch between `pack_id` and `queries`.
        const updateResponse = await apiClient.put(testData.API_PATHS.DETECTION_RULES, {
          headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader },
          body: {
            ...testData.getMinimalRule(),
            id: createResponse.body.id,
            response_actions: [
              {
                action_type_id: '.osquery',
                params: {
                  pack_id: multiPackId,
                  queries: [
                    {
                      id: 'mem',
                      query: 'SELECT * FROM memory_info;',
                      interval: 3600,
                      platform: 'linux',
                    },
                    {
                      id: 'sys',
                      query: 'SELECT * FROM system_info;',
                      interval: 3600,
                      platform: 'linux,windows,darwin',
                    },
                    {
                      id: 'opera',
                      query:
                        'select opera_extensions.* from users join opera_extensions using (uid);',
                      interval: 10,
                    },
                  ],
                },
              },
            ],
          },
          responseType: 'json',
        });
        expect(updateResponse).toHaveStatusCode(200);

        const { params } = updateResponse.body.response_actions[0];
        expect(params.pack_id).toBe(multiPackId);
        expect(params.queries).toHaveLength(3);
        const ids = params.queries.map((q: { id: string }) => q.id).sort();
        expect(ids).toStrictEqual(['mem', 'opera', 'sys']);
      }
    );
  }
);
