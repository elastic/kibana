/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout/src/playwright/fixtures/scope/worker';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { COMMON_HEADERS, ES_QUERY_RULE_PARAMS } from '../../../scout/api/fixtures/constants';
import { getRuleSavedObjectAttributes } from '../../../scout/api/lib/alerting_saved_objects';
import { waitForSuccessfulEventLogEntry } from '../../../scout/api/lib/wait_for_successful_event_log';

const getRuleBody = (name: string, enabled: boolean) => ({
  name,
  rule_type_id: '.es-query',
  consumer: 'alerts',
  enabled,
  // A long interval keeps the scheduler from writing to the rule while a test rotates its
  // keys, so the rotation isn't racing a concurrent saved-object writer. Every execution in
  // these tests is triggered explicitly via `_run_soon`.
  schedule: { interval: '1h' },
  actions: [],
  params: ES_QUERY_RULE_PARAMS,
});

// These tests cannot be run on MKI because they rely on the Mock IdP UIAM setup.
apiTest.describe(
  '[NON-MKI] Rule execution survives API key rotation',
  { tag: tags.serverless.all },
  () => {
    const createdRuleIds: string[] = [];

    const createRule = async (
      apiClient: ApiClientFixture,
      headers: Record<string, string>,
      name: string,
      enabled = true
    ) => {
      const response = await apiClient.post('api/alerting/rule', {
        headers,
        responseType: 'json',
        body: getRuleBody(name, enabled),
      });

      expect(response).toHaveStatusCode(200);
      const ruleId = response.body.id;
      createdRuleIds.push(ruleId);
      return ruleId;
    };

    // Every test waits for at least one rule execution, which does not fit in the default 60s
    // budget on a loaded stack.
    apiTest.beforeEach(() => {
      apiTest.setTimeout(180_000);
    });

    apiTest.afterAll(async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      await Promise.allSettled(
        createdRuleIds.map((ruleId) =>
          apiClient.delete(`api/alerting/rule/${ruleId}`, {
            headers: { ...COMMON_HEADERS, ...cookieHeader },
          })
        )
      );
    });

    apiTest(
      'rotating the API key leaves the rule with a working key',
      async ({ apiClient, esClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
        const headers = { ...COMMON_HEADERS, ...cookieHeader };

        const ruleId = await createRule(apiClient, headers, 'uiam-rotate-api-key-rule');
        await waitForSuccessfulEventLogEntry(apiClient, ruleId, headers);

        const before = await getRuleSavedObjectAttributes(esClient, ruleId);
        expect(typeof before.apiKey).toBe('string');
        expect(typeof before.uiamApiKey).toBe('string');

        const rotateResponse = await apiClient.post(`api/alerting/rule/${ruleId}/_update_api_key`, {
          headers,
        });
        expect(rotateResponse).toHaveStatusCode(204);

        // `_update_api_key` queues the previous keys for invalidation, so every key attribute
        // must have been rewritten. Comparing the stored ciphertext is what gives this teeth:
        // re-encryption always produces a different value, so an attribute that comes back
        // byte-identical is one the write left untouched — which is exactly how a rule ends up
        // still presenting a key that has already been queued for revocation.
        const after = await getRuleSavedObjectAttributes(esClient, ruleId);
        expect(after.apiKey).not.toBe(before.apiKey);
        expect(after.uiamApiKey).not.toBe(before.uiamApiKey);

        await waitForSuccessfulEventLogEntry(apiClient, ruleId, headers);
      }
    );

    apiTest(
      'rotating with an Elasticsearch API key drops the UIAM key rather than stranding it',
      async ({ apiClient, esClient, requestAuth, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
        const headers = { ...COMMON_HEADERS, ...cookieHeader };

        const ruleId = await createRule(apiClient, headers, 'uiam-rotate-with-es-key-rule');
        await waitForSuccessfulEventLogEntry(apiClient, ruleId, headers);

        const before = await getRuleSavedObjectAttributes(esClient, ruleId);
        expect(typeof before.uiamApiKey).toBe('string');
        expect(before.apiKeyCreatedByUser).toBe(false);

        // An Elasticsearch API key carries no UIAM credential, so rotating on its behalf clones
        // the Elasticsearch key and mints no UIAM key at all. This is the case the rest of the
        // suite cannot reach: the rule's UIAM key is queued for invalidation while the new key
        // set has nothing to put in its place, so the attribute has to be removed. Left behind,
        // it is a key the rule keeps presenting right up until the invalidation task revokes it.
        const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
        const rotateResponse = await apiClient.post(`api/alerting/rule/${ruleId}/_update_api_key`, {
          headers: { ...COMMON_HEADERS, ...apiKeyHeader },
        });
        expect(rotateResponse).toHaveStatusCode(204);

        const after = await getRuleSavedObjectAttributes(esClient, ruleId);
        expect(after.uiamApiKey).toBeUndefined();
        expect(after.apiKey).not.toBe(before.apiKey);

        await waitForSuccessfulEventLogEntry(apiClient, ruleId, headers);
      }
    );

    apiTest(
      'enabling a rule that has no API key mints one the rule can run with',
      async ({ apiClient, esClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
        const headers = { ...COMMON_HEADERS, ...cookieHeader };

        // A rule created disabled resolves no API key, so enabling it takes the minting path.
        const ruleId = await createRule(apiClient, headers, 'uiam-enable-mints-key-rule', false);

        const before = await getRuleSavedObjectAttributes(esClient, ruleId);
        expect(before.apiKey).toBeNull();

        const enableResponse = await apiClient.post(`api/alerting/rule/${ruleId}/_enable`, {
          headers,
        });
        expect(enableResponse).toHaveStatusCode(204);

        const after = await getRuleSavedObjectAttributes(esClient, ruleId);
        expect(typeof after.apiKey).toBe('string');
        expect(typeof after.uiamApiKey).toBe('string');

        await waitForSuccessfulEventLogEntry(apiClient, ruleId, headers);
      }
    );

    apiTest(
      're-enabling a rule keeps the key it was already running with',
      async ({ apiClient, esClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
        const headers = { ...COMMON_HEADERS, ...cookieHeader };

        const ruleId = await createRule(apiClient, headers, 'uiam-re-enable-rule');
        await waitForSuccessfulEventLogEntry(apiClient, ruleId, headers);

        const before = await getRuleSavedObjectAttributes(esClient, ruleId);
        expect(typeof before.apiKey).toBe('string');
        expect(typeof before.uiamApiKey).toBe('string');

        const disableResponse = await apiClient.post(`api/alerting/rule/${ruleId}/_disable`, {
          headers,
        });
        expect(disableResponse).toHaveStatusCode(204);

        const enableResponse = await apiClient.post(`api/alerting/rule/${ruleId}/_enable`, {
          headers,
        });
        expect(enableResponse).toHaveStatusCode(204);

        // The stored keys cannot be compared for equality: they are encrypted attributes, and
        // re-encrypting the same key yields different ciphertext, so a rule that is rewritten
        // unchanged still looks different here. What matters is that the rule comes out of
        // enable holding a usable, framework-owned key set, which the execution below proves.
        const after = await getRuleSavedObjectAttributes(esClient, ruleId);
        expect(typeof after.apiKey).toBe('string');
        expect(typeof after.uiamApiKey).toBe('string');
        expect(after.apiKeyCreatedByUser).toBe(before.apiKeyCreatedByUser);
        expect(after.apiKeyOwner).toBe(before.apiKeyOwner);

        await waitForSuccessfulEventLogEntry(apiClient, ruleId, headers);
      }
    );

    apiTest(
      'updating a rule leaves it with a working key',
      async ({ apiClient, esClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
        const headers = { ...COMMON_HEADERS, ...cookieHeader };

        const ruleId = await createRule(apiClient, headers, 'uiam-update-rule');
        await waitForSuccessfulEventLogEntry(apiClient, ruleId, headers);

        const before = await getRuleSavedObjectAttributes(esClient, ruleId);
        expect(typeof before.apiKey).toBe('string');
        expect(typeof before.uiamApiKey).toBe('string');

        const updateResponse = await apiClient.put(`api/alerting/rule/${ruleId}`, {
          headers,
          responseType: 'json',
          body: {
            name: 'uiam-update-rule-renamed',
            tags: [],
            schedule: { interval: '1h' },
            params: ES_QUERY_RULE_PARAMS,
            actions: [],
          },
        });
        expect(updateResponse).toHaveStatusCode(200);

        // Update rotates the keys and queues the previous ones for invalidation, so as above
        // no key attribute may come back byte-identical.
        const after = await getRuleSavedObjectAttributes(esClient, ruleId);
        expect(after.apiKey).not.toBe(before.apiKey);
        expect(after.uiamApiKey).not.toBe(before.uiamApiKey);

        await waitForSuccessfulEventLogEntry(apiClient, ruleId, headers);
      }
    );
  }
);
