/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import { ALERTING_V2_RULES_ALL_ROLE, apiTest, buildCreateRuleData, testData } from '../fixtures';

const getRuleUrl = (id: string) => `${testData.RULE_API_PATH}/${id}`;

const THRESHOLD_FIELDS = {
  indexPattern: 'logs-*',
  timeField: '@timestamp',
  stats: [{ label: 'errors', aggregation: 'count', filter: 'log.level == "error"' }],
  evaluations: [],
  alertConditions: [{ metric: 'errors', comparator: '>', threshold: [10] }],
  conditionOperator: 'AND',
  groupByFields: ['host.name'],
};

/**
 * A rule the `threshold` builder owns: the caller sends parameters and no query,
 * so `query` in the response is whatever the server generated from them.
 */
const buildBuilderRuleData = (name: string) => {
  const { query, grouping, ...rest } = buildCreateRuleData({
    metadata: { name, builder_type: 'threshold', builder_fields: THRESHOLD_FIELDS },
  });
  return rest;
};

apiTest.describe('Builder-managed rules API', { tag: '@local-stateful-classic' }, () => {
  let writerCredentials: RoleApiCredentials;
  let writerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    writerCredentials = await requestAuth.getApiKeyForCustomRole(ALERTING_V2_RULES_ALL_ROLE);
    writerHeaders = { ...testData.COMMON_HEADERS, ...writerCredentials.apiKeyHeader };
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
  });

  apiTest(
    'create: generates the query from builder_fields and persists both',
    async ({ apiClient, apiServices }) => {
      const response = await apiClient.post(testData.RULE_API_PATH, {
        headers: writerHeaders,
        body: buildBuilderRuleData('builder-generated-rule'),
      });

      expect(response).toHaveStatusCode(201);
      expect(response.body.query.format).toBe('composed');
      expect(response.body.query.base).toContain('FROM logs-*');
      expect(response.body.query.base).toContain('COUNT(*) WHERE log.level == "error"');
      expect(response.body.query.base).toContain('BY host.name');
      expect(response.body.query.breach.segment).toBe('| WHERE errors > 10.0');
      // Derived from the same fields as the query, so the builder owns them too.
      expect(response.body.time_field).toBe('@timestamp');
      expect(response.body.grouping).toStrictEqual({ fields: ['host.name'] });

      const persisted = await apiServices.alertingV2.rules.get(response.body.id);
      expect(persisted.metadata.builder_type).toBe('threshold');
      expect(persisted.metadata.builder_fields).toStrictEqual(THRESHOLD_FIELDS);
    }
  );

  apiTest('update: regenerates the query when builder_fields change', async ({ apiClient }) => {
    const created = await apiClient.post(testData.RULE_API_PATH, {
      headers: writerHeaders,
      body: buildBuilderRuleData('builder-regenerated-rule'),
    });
    expect(created).toHaveStatusCode(201);

    const response = await apiClient.patch(getRuleUrl(created.body.id), {
      headers: writerHeaders,
      body: {
        metadata: {
          builder_fields: {
            ...THRESHOLD_FIELDS,
            alertConditions: [{ metric: 'errors', comparator: '>=', threshold: [50] }],
          },
        },
      },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.query.breach.segment).toBe('| WHERE errors >= 50.0');
    expect(response.body.metadata.builder_fields.alertConditions).toStrictEqual([
      { metric: 'errors', comparator: '>=', threshold: [50] },
    ]);
  });

  apiTest(
    'update: releases the query for direct editing when the builder is cleared',
    async ({ apiClient }) => {
      const created = await apiClient.post(testData.RULE_API_PATH, {
        headers: writerHeaders,
        body: buildBuilderRuleData('builder-opt-out-rule'),
      });
      expect(created).toHaveStatusCode(201);

      const response = await apiClient.patch(getRuleUrl(created.body.id), {
        headers: writerHeaders,
        body: {
          metadata: { builder_type: null },
          query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 1' } },
        },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.metadata.builder_type).toBeUndefined();
      expect(response.body.metadata.builder_fields).toBeUndefined();
      expect(response.body.query).toStrictEqual({
        format: 'standalone',
        breach: { query: 'FROM logs-* | LIMIT 1' },
      });
    }
  );

  apiTest(
    'create: rejects builder_fields the threshold builder does not accept',
    async ({ apiClient }) => {
      const body = buildBuilderRuleData('builder-invalid-fields-rule');
      const response = await apiClient.post(testData.RULE_API_PATH, {
        headers: writerHeaders,
        body: {
          ...body,
          metadata: {
            ...body.metadata,
            // `avg` needs a field to average.
            builder_fields: {
              ...THRESHOLD_FIELDS,
              stats: [{ label: 'errors', aggregation: 'avg' }],
            },
          },
        },
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('INVALID_BUILDER_FIELDS');
    }
  );
});
