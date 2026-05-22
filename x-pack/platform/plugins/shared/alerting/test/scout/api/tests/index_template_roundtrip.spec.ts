/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { COMMON_HEADERS } from '../fixtures/constants';

// Fields that the PUT index template API accepts (user-controlled).
const PUT_SAFE_FIELDS = new Set([
  'index_patterns',
  'composed_of',
  'template',
  'version',
  'priority',
  '_meta',
  'allow_auto_create',
  'data_stream',
  'deprecated',
  'ignore_missing_component_templates',
]);

// System-managed fields that ES returns in GET but rejects in PUT.
const STRIPPED_SYSTEM_FIELDS = new Set([
  'created_date',
  'created_date_millis',
  'modified_date',
  'modified_date_millis',
]);

apiTest.describe(
  'Alerting index template GET→PUT roundtrip',
  { tag: tags.serverless.observability.complete },
  () => {
    let templateName: string;

    apiTest.beforeAll(async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

      // Create a rule so the alerting service bootstraps its index templates
      const response = await apiClient.post('api/alerting/rule', {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: {
          name: 'scout-template-roundtrip',
          rule_type_id: '.index-threshold',
          consumer: 'stackAlerts',
          schedule: { interval: '24h' },
          enabled: false,
          actions: [],
          params: {
            aggType: 'count',
            termSize: 5,
            thresholdComparator: '>' as const,
            timeWindowSize: 5,
            timeWindowUnit: 'm' as const,
            groupBy: 'all' as const,
            threshold: [1000000],
            index: ['.kibana-event-log-*'],
            timeField: '@timestamp',
          },
          tags: ['scout-roundtrip'],
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);

      // Store the rule ID for cleanup
      const ruleId = (response.body as { id: string }).id;

      // Delete the rule immediately; we only needed it to bootstrap index templates
      const deleteResponse = await apiClient.delete(`api/alerting/rule/${ruleId}`, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
      });
      expect(deleteResponse.statusCode === 204 || deleteResponse.statusCode === 404).toBe(true);
    });

    apiTest(
      'GET response contains no unexpected fields outside PUT_SAFE and STRIPPED sets',
      async ({ esClient }) => {
        const { index_templates: templates } = await esClient.indices.getIndexTemplate({
          name: '.alerts-stack.alerts-*-index-template',
        });

        expect(templates.length).toBeGreaterThan(0);
        templateName = templates[0].name;

        const allFields = Object.keys(templates[0].index_template);
        const knownFields = new Set([...PUT_SAFE_FIELDS, ...STRIPPED_SYSTEM_FIELDS]);
        const unexpected = allFields.filter((field) => !knownFields.has(field));

        expect(unexpected).toStrictEqual([]);
      }
    );

    apiTest('stripping system-managed fields and PUTting back succeeds', async ({ esClient }) => {
      const { index_templates: templates } = await esClient.indices.getIndexTemplate({
        name: templateName,
      });

      expect(templates).toHaveLength(1);
      const { index_template: indexTemplate } = templates[0];

      // Strip system-managed fields, exactly as updateIndexTemplateFieldsLimit does
      const { ignore_missing_component_templates: rawIgnoreMissing, ...putBody } =
        Object.fromEntries(
          Object.entries(indexTemplate).filter(([key]) => !STRIPPED_SYSTEM_FIELDS.has(key))
        );

      // Normalize ignore_missing_component_templates: filter out undefined, wrap string in array
      const normalizedIgnoreMissing = [rawIgnoreMissing]
        .flat()
        .filter((v): v is string => typeof v === 'string');

      // PUT the template back with only safe fields — should not throw
      const result = await esClient.indices.putIndexTemplate({
        name: templateName,
        ...putBody,
        ...(normalizedIgnoreMissing.length > 0 && {
          ignore_missing_component_templates: normalizedIgnoreMissing,
        }),
      });

      expect(result.acknowledged).toBe(true);
    });
  }
);
