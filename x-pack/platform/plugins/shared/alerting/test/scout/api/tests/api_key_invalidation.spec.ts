/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { COMMON_HEADERS } from '../fixtures/constants';
import {
  countApiKeysQueuedForInvalidationSince,
  getRuleSavedObjectAttributes,
  waitForQuietRuleSavedObject,
} from '../lib/alerting_saved_objects';
import { waitForSuccessfulEventLogEntry } from '../lib/wait_for_successful_event_log';

const INDEX_THRESHOLD_PARAMS = {
  aggType: 'count',
  termSize: 5,
  thresholdComparator: '>' as const,
  timeWindowSize: 5,
  timeWindowUnit: 'm' as const,
  groupBy: 'all' as const,
  threshold: [10],
  index: ['.kibana-event-log-*'],
  timeField: '@timestamp',
};

apiTest.describe(
  '[NON-MKI] API key invalidation on rule operations',
  // Local-only (no `@cloud-*`): the assertions read the rule's encrypted attributes and the queued
  // invalidations straight from the alerting saved-object index, which a Cloud project does not
  // expose.
  { tag: ['@local-serverless-observability_complete'] },
  () => {
    const ruleIds: string[] = [];

    // Waiting for a rule execution and then for the rule to stop being written to does not fit
    // in the default 60s budget on a loaded stack.
    apiTest.beforeEach(() => {
      apiTest.setTimeout(180_000);
    });

    // Deleting the rules queues their keys for invalidation, which is the invalidation task's job
    // to drain. The pending entries are deployment-wide, so this suite leaves them alone rather
    // than deleting ones other suites are relying on.
    apiTest.afterAll(async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      await Promise.allSettled(
        ruleIds.map((ruleId) =>
          apiClient.delete(`api/alerting/rule/${ruleId}`, {
            headers: { ...COMMON_HEADERS, ...cookieHeader },
          })
        )
      );
    });

    apiTest(
      'enable rule preserves existing API keys without invalidation',
      async ({ apiClient, esClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        const createResponse = await apiClient.post('api/alerting/rule', {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: {
            name: 'scout-enable-test',
            rule_type_id: '.index-threshold',
            consumer: 'stackAlerts',
            schedule: { interval: '1m' },
            enabled: true,
            actions: [],
            params: INDEX_THRESHOLD_PARAMS,
            tags: ['scout-api-key-invalidation'],
          },
          responseType: 'json',
        });
        expect(createResponse).toHaveStatusCode(200);
        const ruleId = (createResponse.body as { id: string }).id;
        ruleIds.push(ruleId);

        const attrsBefore = await getRuleSavedObjectAttributes(esClient, ruleId);
        expect(attrsBefore.apiKey).toBeDefined();
        expect(attrsBefore.uiamApiKey).toBeDefined();

        await apiClient.post(`api/alerting/rule/${ruleId}/_disable`, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
        });

        const since = new Date().toISOString();

        const enableResponse = await apiClient.post(`api/alerting/rule/${ruleId}/_enable`, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
        });
        expect(enableResponse).toHaveStatusCode(204);

        // Enabling a rule that already has keys reuses them, so it must queue nothing.
        expect(await countApiKeysQueuedForInvalidationSince(esClient, since)).toBe(0);

        const attrsAfter = await getRuleSavedObjectAttributes(esClient, ruleId);
        expect(attrsAfter.apiKey).toBeDefined();
        expect(attrsAfter.uiamApiKey).toBeDefined();
      }
    );

    apiTest(
      'update rule rotates both apiKey and uiamApiKey',
      async ({ apiClient, esClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        const createResponse = await apiClient.post('api/alerting/rule', {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: {
            name: 'scout-update-rule-test',
            rule_type_id: '.index-threshold',
            consumer: 'stackAlerts',
            // A long interval keeps the scheduler out of the way: the rule runs once when it is
            // created and not again inside the test window.
            schedule: { interval: '1h' },
            enabled: true,
            actions: [],
            params: INDEX_THRESHOLD_PARAMS,
            tags: ['scout-api-key-invalidation'],
          },
          responseType: 'json',
        });
        expect(createResponse).toHaveStatusCode(200);
        const ruleId = (createResponse.body as { id: string }).id;
        ruleIds.push(ruleId);

        await waitForSuccessfulEventLogEntry(apiClient, ruleId, {
          ...COMMON_HEADERS,
          ...cookieHeader,
        });
        await waitForQuietRuleSavedObject(esClient, ruleId);

        const attrsBefore = await getRuleSavedObjectAttributes(esClient, ruleId);
        expect(attrsBefore.apiKey).toBeDefined();
        expect(attrsBefore.uiamApiKey).toBeDefined();

        const since = new Date().toISOString();

        const updateResponse = await apiClient.put(`api/alerting/rule/${ruleId}`, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: {
            name: 'scout-update-rule-test-updated',
            tags: ['scout-api-key-invalidation'],
            schedule: { interval: '1h' },
            params: INDEX_THRESHOLD_PARAMS,
            actions: [],
          },
          responseType: 'json',
        });
        expect(updateResponse).toHaveStatusCode(200);

        const attrsAfter = await getRuleSavedObjectAttributes(esClient, ruleId);
        expect(attrsAfter.apiKey).toBeDefined();
        expect(attrsAfter.uiamApiKey).toBeDefined();
        expect(attrsAfter.apiKey).not.toBe(attrsBefore.apiKey);
        expect(attrsAfter.uiamApiKey).not.toBe(attrsBefore.uiamApiKey);

        // Exactly the previous ES + UIAM keys should be queued for
        // invalidation: one entry each.
        expect(await countApiKeysQueuedForInvalidationSince(esClient, since)).toBe(2);
      }
    );

    apiTest(
      'update_api_key rotates both apiKey and uiamApiKey',
      async ({ apiClient, esClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        const createResponse = await apiClient.post('api/alerting/rule', {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: {
            name: 'scout-update-api-key-test',
            rule_type_id: '.index-threshold',
            consumer: 'stackAlerts',
            // A long interval keeps the scheduler out of the way: the rule runs once when it is
            // created and not again inside the test window.
            schedule: { interval: '1h' },
            enabled: true,
            actions: [],
            params: INDEX_THRESHOLD_PARAMS,
            tags: ['scout-api-key-invalidation'],
          },
          responseType: 'json',
        });
        expect(createResponse).toHaveStatusCode(200);
        const ruleId = (createResponse.body as { id: string }).id;
        ruleIds.push(ruleId);

        await waitForSuccessfulEventLogEntry(apiClient, ruleId, {
          ...COMMON_HEADERS,
          ...cookieHeader,
        });
        await waitForQuietRuleSavedObject(esClient, ruleId);

        const attrsBefore = await getRuleSavedObjectAttributes(esClient, ruleId);
        expect(attrsBefore.apiKey).toBeDefined();
        expect(attrsBefore.uiamApiKey).toBeDefined();

        const since = new Date().toISOString();

        const updateApiKeyResponse = await apiClient.post(
          `api/alerting/rule/${ruleId}/_update_api_key`,
          { headers: { ...COMMON_HEADERS, ...cookieHeader } }
        );
        expect(updateApiKeyResponse).toHaveStatusCode(204);

        const attrsAfter = await getRuleSavedObjectAttributes(esClient, ruleId);
        expect(attrsAfter.apiKey).toBeDefined();
        expect(attrsAfter.uiamApiKey).toBeDefined();
        expect(attrsAfter.apiKey).not.toBe(attrsBefore.apiKey);
        expect(attrsAfter.uiamApiKey).not.toBe(attrsBefore.uiamApiKey);

        // Exactly the previous ES + UIAM keys should be queued for
        // invalidation: one entry each.
        expect(await countApiKeysQueuedForInvalidationSince(esClient, since)).toBe(2);
      }
    );

    apiTest(
      'bulk enable preserves existing API keys without invalidation',
      async ({ apiClient, esClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        const createResponse = await apiClient.post('api/alerting/rule', {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: {
            name: 'scout-bulk-enable-test',
            rule_type_id: '.index-threshold',
            consumer: 'stackAlerts',
            schedule: { interval: '1m' },
            enabled: true,
            actions: [],
            params: INDEX_THRESHOLD_PARAMS,
            tags: ['scout-api-key-invalidation'],
          },
          responseType: 'json',
        });
        expect(createResponse).toHaveStatusCode(200);
        const ruleId = (createResponse.body as { id: string }).id;
        ruleIds.push(ruleId);

        const attrsBefore = await getRuleSavedObjectAttributes(esClient, ruleId);
        expect(attrsBefore.apiKey).toBeDefined();
        expect(attrsBefore.uiamApiKey).toBeDefined();

        await apiClient.post(`api/alerting/rule/${ruleId}/_disable`, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
        });

        const since = new Date().toISOString();

        const bulkEnableResponse = await apiClient.patch('internal/alerting/rules/_bulk_enable', {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: { ids: [ruleId] },
          responseType: 'json',
        });
        expect(bulkEnableResponse).toHaveStatusCode(200);

        // Enabling a rule that already has keys reuses them, so it must queue nothing.
        expect(await countApiKeysQueuedForInvalidationSince(esClient, since)).toBe(0);

        const attrsAfter = await getRuleSavedObjectAttributes(esClient, ruleId);
        expect(attrsAfter.apiKey).toBeDefined();
        expect(attrsAfter.uiamApiKey).toBeDefined();
      }
    );
  }
);
