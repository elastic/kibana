/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { COMMON_HEADERS, ES_QUERY_RULE_PARAMS } from '../../../scout/api/fixtures/constants';
import { getRuleSavedObjectAttributes } from '../../../scout/api/lib/alerting_saved_objects';
import { waitForSuccessfulEventLogEntry } from '../../../scout/api/lib/wait_for_successful_event_log';

apiTest.describe(
  '[NON-MKI] Missing UIAM API key tag reconciliation',
  { tag: tags.serverless.security.complete },
  () => {
    let ruleId: string | undefined;

    apiTest.afterAll(async ({ apiServices }) => {
      if (!ruleId) {
        return;
      }

      await apiServices.alerting.rules.delete(ruleId);
    });

    apiTest(
      'rule execution reconciles missing UIAM API key tags',
      async ({ apiClient, esClient, requestAuth, samlAuth }) => {
        apiTest.setTimeout(600_000);

        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
        const headers = { ...COMMON_HEADERS, ...cookieHeader };
        const createResponse = await apiClient.post('api/alerting/rule', {
          headers,
          responseType: 'json',
          body: {
            name: 'uiam-missing-key-tag-rule',
            rule_type_id: '.es-query',
            consumer: 'alerts',
            enabled: true,
            schedule: { interval: '1h' },
            actions: [],
            params: ES_QUERY_RULE_PARAMS,
          },
        });
        expect(createResponse).toHaveStatusCode(200);
        const createdRuleId = createResponse.body.id;
        ruleId = createdRuleId;

        await waitForSuccessfulEventLogEntry(apiClient, createdRuleId, headers);

        const before = await getRuleSavedObjectAttributes(esClient, createdRuleId);
        expect(typeof before.uiamApiKey).toBe('string');
        expect(before.apiKeyCreatedByUser).toBe(false);

        // Rotating on behalf of an Elasticsearch API key removes the rule's UIAM key because
        // that authentication flow cannot mint a replacement UIAM credential.
        const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
        const rotateResponse = await apiClient.post(
          `api/alerting/rule/${createdRuleId}/_update_api_key`,
          { headers: { ...COMMON_HEADERS, ...apiKeyHeader } }
        );
        expect(rotateResponse).toHaveStatusCode(204);

        const afterRotation = await getRuleSavedObjectAttributes(esClient, createdRuleId);
        expect(afterRotation.uiamApiKey).toBeUndefined();
        expect(afterRotation.apiKey).not.toBe(before.apiKey);
        expect(afterRotation.tags).toStrictEqual([]);

        await waitForSuccessfulEventLogEntry(apiClient, createdRuleId, headers);

        const afterMissingKeyExecution = await getRuleSavedObjectAttributes(
          esClient,
          createdRuleId
        );
        expect(afterMissingKeyExecution.tags).toStrictEqual(['Missing Elastic Cloud API Key']);

        const updateWithLegacyTagResponse = await apiClient.put(
          `api/alerting/rule/${createdRuleId}`,
          {
            headers: { ...COMMON_HEADERS, ...apiKeyHeader },
            responseType: 'json',
            body: {
              name: 'uiam-missing-key-tag-rule',
              tags: ['existing-tag', 'Missing Universal Api Key'],
              schedule: { interval: '1h' },
              params: ES_QUERY_RULE_PARAMS,
              actions: [],
            },
          }
        );
        expect(updateWithLegacyTagResponse).toHaveStatusCode(200);

        const afterLegacyTagUpdate = await getRuleSavedObjectAttributes(esClient, createdRuleId);
        expect(afterLegacyTagUpdate.uiamApiKey).toBeUndefined();
        expect(afterLegacyTagUpdate.tags).toStrictEqual([
          'existing-tag',
          'Missing Universal Api Key',
        ]);

        await waitForSuccessfulEventLogEntry(apiClient, createdRuleId, headers);

        const afterLegacyTagExecution = await getRuleSavedObjectAttributes(esClient, createdRuleId);
        expect(afterLegacyTagExecution.uiamApiKey).toBeUndefined();
        expect(afterLegacyTagExecution.tags).toStrictEqual([
          'existing-tag',
          'Missing Elastic Cloud API Key',
        ]);

        const restoreUiamKeyResponse = await apiClient.post(
          `api/alerting/rule/${createdRuleId}/_update_api_key`,
          { headers }
        );
        expect(restoreUiamKeyResponse).toHaveStatusCode(204);

        const afterUiamKeyRestoration = await getRuleSavedObjectAttributes(esClient, createdRuleId);
        expect(typeof afterUiamKeyRestoration.uiamApiKey).toBe('string');
        expect(afterUiamKeyRestoration.tags).toStrictEqual([
          'existing-tag',
          'Missing Elastic Cloud API Key',
        ]);

        await waitForSuccessfulEventLogEntry(apiClient, createdRuleId, headers);

        const afterRestoredKeyExecution = await getRuleSavedObjectAttributes(
          esClient,
          createdRuleId
        );
        expect(typeof afterRestoredKeyExecution.uiamApiKey).toBe('string');
        expect(afterRestoredKeyExecution.tags).toStrictEqual(['existing-tag']);
      }
    );
  }
);
