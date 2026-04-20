/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { COMMON_HEADERS } from '../fixtures/constants';

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

const getAlertAttrs = async (
  esClient: { get: (params: { index: string; id: string }) => Promise<{ _source?: unknown }> },
  ruleId: string
) => {
  const { _source } = await esClient.get({
    index: '.kibana_alerting_cases_1',
    id: `alert:${ruleId}`,
  });
  expect(_source).toBeDefined();
  return (_source as Record<string, unknown>)?.alert as Record<string, unknown>;
};

apiTest.describe(
  'API key invalidation on rule operations',
  { tag: tags.serverless.observability.complete },
  () => {
    const ruleIds: string[] = [];

    apiTest.afterAll(async ({ apiClient, kbnClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      await Promise.allSettled(
        ruleIds.map((ruleId) =>
          apiClient.delete(`api/alerting/rule/${ruleId}`, {
            headers: { ...COMMON_HEADERS, ...cookieHeader },
          })
        )
      );
      await kbnClient.savedObjects.clean({ types: ['api_key_pending_invalidation'] });
    });

    apiTest(
      'enable rule preserves existing API keys without invalidation',
      async ({ apiClient, esClient, kbnClient, samlAuth }) => {
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

        const attrsBefore = await getAlertAttrs(esClient, ruleId);
        expect(attrsBefore.apiKey).toBeDefined();
        expect(attrsBefore.uiamApiKey).toBeDefined();

        await apiClient.post(`api/alerting/rule/${ruleId}/_disable`, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
        });

        await kbnClient.savedObjects.clean({ types: ['api_key_pending_invalidation'] });

        const enableResponse = await apiClient.post(`api/alerting/rule/${ruleId}/_enable`, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
        });
        expect(enableResponse).toHaveStatusCode(204);

        const { saved_objects: pendingInvalidations } = await kbnClient.savedObjects.find({
          type: 'api_key_pending_invalidation',
        });
        expect(pendingInvalidations).toHaveLength(0);

        const attrsAfter = await getAlertAttrs(esClient, ruleId);
        expect(attrsAfter.apiKey).toBeDefined();
        expect(attrsAfter.uiamApiKey).toBeDefined();
      }
    );

    apiTest(
      'update rule rotates both apiKey and uiamApiKey',
      async ({ apiClient, esClient, kbnClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        const createResponse = await apiClient.post('api/alerting/rule', {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: {
            name: 'scout-update-rule-test',
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

        const attrsBefore = await getAlertAttrs(esClient, ruleId);
        expect(attrsBefore.apiKey).toBeDefined();
        expect(attrsBefore.uiamApiKey).toBeDefined();

        await kbnClient.savedObjects.clean({ types: ['api_key_pending_invalidation'] });

        const updateResponse = await apiClient.put(`api/alerting/rule/${ruleId}`, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: {
            name: 'scout-update-rule-test-updated',
            tags: ['scout-api-key-invalidation'],
            schedule: { interval: '1m' },
            params: INDEX_THRESHOLD_PARAMS,
            actions: [],
          },
          responseType: 'json',
        });
        expect(updateResponse).toHaveStatusCode(200);

        const { saved_objects: pendingInvalidations } = await kbnClient.savedObjects.find({
          type: 'api_key_pending_invalidation',
        });
        expect(pendingInvalidations).toHaveLength(2);

        const attrsAfter = await getAlertAttrs(esClient, ruleId);
        expect(attrsAfter.apiKey).toBeDefined();
        expect(attrsAfter.uiamApiKey).toBeDefined();
        expect(attrsAfter.apiKey).not.toBe(attrsBefore.apiKey);
        expect(attrsAfter.uiamApiKey).not.toBe(attrsBefore.uiamApiKey);
      }
    );

    apiTest(
      'update_api_key rotates both apiKey and uiamApiKey',
      async ({ apiClient, esClient, kbnClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        const createResponse = await apiClient.post('api/alerting/rule', {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: {
            name: 'scout-update-api-key-test',
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

        const attrsBefore = await getAlertAttrs(esClient, ruleId);
        expect(attrsBefore.apiKey).toBeDefined();
        expect(attrsBefore.uiamApiKey).toBeDefined();

        await kbnClient.savedObjects.clean({ types: ['api_key_pending_invalidation'] });

        const updateApiKeyResponse = await apiClient.post(
          `api/alerting/rule/${ruleId}/_update_api_key`,
          { headers: { ...COMMON_HEADERS, ...cookieHeader } }
        );
        expect(updateApiKeyResponse).toHaveStatusCode(204);

        const { saved_objects: pendingInvalidations } = await kbnClient.savedObjects.find({
          type: 'api_key_pending_invalidation',
        });
        expect(pendingInvalidations).toHaveLength(2);

        const attrsAfter = await getAlertAttrs(esClient, ruleId);
        expect(attrsAfter.apiKey).toBeDefined();
        expect(attrsAfter.uiamApiKey).toBeDefined();
        expect(attrsAfter.apiKey).not.toBe(attrsBefore.apiKey);
        expect(attrsAfter.uiamApiKey).not.toBe(attrsBefore.uiamApiKey);
      }
    );

    apiTest(
      'bulk enable preserves existing API keys without invalidation',
      async ({ apiClient, esClient, kbnClient, samlAuth }) => {
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

        const attrsBefore = await getAlertAttrs(esClient, ruleId);
        expect(attrsBefore.apiKey).toBeDefined();
        expect(attrsBefore.uiamApiKey).toBeDefined();

        await apiClient.post(`api/alerting/rule/${ruleId}/_disable`, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
        });

        await kbnClient.savedObjects.clean({ types: ['api_key_pending_invalidation'] });

        const bulkEnableResponse = await apiClient.patch('internal/alerting/rules/_bulk_enable', {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: { ids: [ruleId] },
          responseType: 'json',
        });
        expect(bulkEnableResponse).toHaveStatusCode(200);

        const { saved_objects: pendingInvalidations } = await kbnClient.savedObjects.find({
          type: 'api_key_pending_invalidation',
        });
        expect(pendingInvalidations).toHaveLength(0);

        const attrsAfter = await getAlertAttrs(esClient, ruleId);
        expect(attrsAfter.apiKey).toBeDefined();
        expect(attrsAfter.uiamApiKey).toBeDefined();
      }
    );
  }
);
