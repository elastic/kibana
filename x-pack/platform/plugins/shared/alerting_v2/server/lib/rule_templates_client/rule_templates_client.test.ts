/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { toKqlExpression } from '@kbn/es-query';
import { RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { RuleTemplatesClient } from './rule_templates_client';
import type { RuleTemplateSavedObjectAttributes } from './types';

const createMockSavedObjectsClient = () =>
  ({
    find: jest.fn(),
  }) as unknown as jest.Mocked<SavedObjectsClientContract>;

const createTemplateAttributes = (
  overrides: Partial<RuleTemplateSavedObjectAttributes> = {}
): RuleTemplateSavedObjectAttributes =>
  ({
    kind: 'alert',
    engine: 'v2',
    metadata: {
      name: 'CPU high',
      description: 'Alerts when CPU is high',
      tags: ['k8s'],
    },
    schedule: { every: '1m', lookback: '15m' },
    time_field: '@timestamp',
    query: {
      format: 'composed',
      base: 'FROM metrics-*',
      breach: { segment: 'WHERE cpu > 90' },
    },
    ...overrides,
  }) as RuleTemplateSavedObjectAttributes;

describe('RuleTemplatesClient', () => {
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let client: RuleTemplatesClient;

  beforeEach(() => {
    savedObjectsClient = createMockSavedObjectsClient();
    client = new RuleTemplatesClient(savedObjectsClient);
  });

  describe('findRuleTemplates', () => {
    it('returns transformed templates with default pagination', async () => {
      savedObjectsClient.find.mockResolvedValueOnce({
        total: 1,
        page: 1,
        per_page: 20,
        saved_objects: [
          {
            id: 'template-1',
            type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
            attributes: createTemplateAttributes(),
            references: [],
          },
        ],
      });

      const result = await client.findRuleTemplates();

      expect(result).toEqual({
        items: [
          expect.objectContaining({
            id: 'template-1',
            engine: 'v2',
            kind: 'alert',
            metadata: expect.objectContaining({
              name: 'CPU high',
              tags: ['k8s'],
            }),
            schedule: { every: '1m', lookback: '15m' },
          }),
        ],
        total: 1,
        page: 1,
        perPage: 20,
      });
    });

    it('always filters to engine v2', async () => {
      savedObjectsClient.find.mockResolvedValueOnce({
        total: 0,
        page: 1,
        per_page: 20,
        saved_objects: [],
      });

      await client.findRuleTemplates();

      expect(toKqlExpression(savedObjectsClient.find.mock.calls[0][0].filter!)).toBe(
        'alerting_rule_template.attributes.engine: v2'
      );
    });

    it('combines engine filter with tags', async () => {
      savedObjectsClient.find.mockResolvedValueOnce({
        total: 0,
        page: 1,
        per_page: 20,
        saved_objects: [],
      });

      await client.findRuleTemplates({
        tags: ['k8s', 'otel'],
      });

      expect(toKqlExpression(savedObjectsClient.find.mock.calls[0][0].filter!)).toBe(
        '(alerting_rule_template.attributes.engine: v2 AND ' +
          '(alerting_rule_template.attributes.metadata.tags: k8s OR alerting_rule_template.attributes.metadata.tags: otel))'
      );
    });

    it('passes search, sort, and pagination to the saved objects client', async () => {
      savedObjectsClient.find.mockResolvedValueOnce({
        total: 0,
        page: 2,
        per_page: 5,
        saved_objects: [],
      });

      await client.findRuleTemplates({
        page: 2,
        perPage: 5,
        search: 'cpu high',
        sortField: 'name',
        sortOrder: 'desc',
      });

      expect(savedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
          page: 2,
          perPage: 5,
          search: 'cpu* high*',
          searchFields: ['metadata.name', 'metadata.description'],
          defaultSearchOperator: 'AND',
          sortField: 'metadata.name.keyword',
          sortOrder: 'desc',
        })
      );
    });
  });
});
