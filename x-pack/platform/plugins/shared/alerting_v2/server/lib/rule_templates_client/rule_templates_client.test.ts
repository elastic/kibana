/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { nodeBuilder, nodeTypes } from '@kbn/es-query';
import { RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '../../../common/saved_object_types';
import { ALERTING_ERROR_CODES, ALERTING_LOG_CODES } from '../errors/error_codes';
import type { CreateRuleData, RuleResponse } from '@kbn/alerting-v2-schemas';
import type { RulesClient } from '../rules_client';
import { createLoggerService } from '../services/logger_service/logger_service.mock';
import { RuleTemplatesClient } from './rule_templates_client';
import { buildRuleTemplateTagsAggregation } from './utils';

const validTemplateAttributes = {
  engine: 'v2' as const,
  rule: {
    kind: 'alert' as const,
    metadata: {
      name: 'Pod CrashLoopBackOff',
      description: 'Alerts when containers have a high restart count.',
      tags: ['Kubernetes'],
    },
    schedule: {
      every: '1m',
      lookback: '15m',
    },
    state_transition: { pending: { count: 3 } },
    recovery: { strategy: 'no_breach' as const },
    no_data: { strategy: 'ignore' as const },
    query: {
      base: 'TS metrics-* | STATS restarts = MAX(k8s.container.restarts) BY k8s.pod.name',
      breach: {
        segment: 'WHERE restarts > 0 | SORT restarts DESC | LIMIT 50',
      },
    },
    grouping: {
      fields: ['k8s.pod.name'],
    },
    time_field: '@timestamp',
  },
};

const createClient = (
  savedObjectsClient: SavedObjectsClientContract = savedObjectsClientMock.create()
) => {
  const { loggerService, mockLogger } = createLoggerService();
  const rulesClient = {
    createRule: jest.fn(),
    getRuleCountsByTemplateId: jest.fn().mockResolvedValue({}),
  } as unknown as jest.Mocked<RulesClient>;
  const client = new RuleTemplatesClient(savedObjectsClient, loggerService, rulesClient);
  return { client, savedObjectsClient, loggerService, mockLogger, rulesClient };
};

describe('RuleTemplatesClient', () => {
  describe('getTags', () => {
    it('aggregates v2 template tags independently of list pagination', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.find.mockResolvedValue({
        saved_objects: [],
        total: 60,
        page: 1,
        per_page: 0,
        aggregations: { tags: { buckets: [{ key: 'nginx' }, { key: 'infra' }] } },
      });
      const { client } = createClient(savedObjectsClient);

      await expect(client.getTags()).resolves.toEqual(['nginx', 'infra']);
      expect(savedObjectsClient.find).toHaveBeenCalledWith({
        type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
        perPage: 0,
        filter: nodeBuilder.is(`${RULE_TEMPLATE_SAVED_OBJECT_TYPE}.attributes.engine`, 'v2'),
        aggs: buildRuleTemplateTagsAggregation(),
      });
    });

    it('forwards the search prefix to the aggregation builder', async () => {
      const search = 'pro';
      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.find.mockResolvedValue({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 0,
        aggregations: { tags: { buckets: [] } },
      });
      const { client } = createClient(savedObjectsClient);

      await client.getTags({ search });

      expect(savedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          aggs: buildRuleTemplateTagsAggregation(search),
        })
      );
    });

    it('returns no tags when aggregations are absent', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.find.mockResolvedValue({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 0,
      });
      const { client } = createClient(savedObjectsClient);
      await expect(client.getTags()).resolves.toEqual([]);
    });

    it('propagates saved object failures', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.find.mockRejectedValue(new Error('Unavailable'));
      const { client } = createClient(savedObjectsClient);

      await expect(client.getTags()).rejects.toThrow('Unavailable');
    });
  });

  describe('findRuleTemplates', () => {
    it('returns transformed templates with default paging', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: 'template-1',
            type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
            attributes: validTemplateAttributes,
            references: [],
            score: 1,
          },
        ],
        total: 1,
        page: 1,
        per_page: 20,
      });

      const { client } = createClient(savedObjectsClient);
      const result = await client.findRuleTemplates();

      expect(savedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
          page: 1,
          perPage: 20,
          sortField: 'rule.metadata.name.keyword',
          sortOrder: 'asc',
          filter: nodeBuilder.is(`${RULE_TEMPLATE_SAVED_OBJECT_TYPE}.attributes.engine`, 'v2'),
        })
      );
      expect(result).toEqual({
        items: [{ id: 'template-1', ...validTemplateAttributes, rule_count: 0 }],
        total: 1,
        page: 1,
        per_page: 20,
      });
    });

    describe('rule_count', () => {
      const findResponse = (ids: string[]) => ({
        saved_objects: ids.map((id) => ({
          id,
          type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
          attributes: validTemplateAttributes,
          references: [],
          score: 1,
        })),
        total: ids.length,
        page: 1,
        per_page: 20,
      });

      it('sets the number of rules created from each template, defaulting to 0', async () => {
        const savedObjectsClient = savedObjectsClientMock.create();
        savedObjectsClient.find.mockResolvedValue(findResponse(['template-1', 'template-2']));
        const { client, rulesClient } = createClient(savedObjectsClient);
        rulesClient.getRuleCountsByTemplateId.mockResolvedValue({ 'template-1': 3 });

        const result = await client.findRuleTemplates();

        expect(result.items.map(({ id, rule_count: ruleCount }) => [id, ruleCount])).toEqual([
          ['template-1', 3],
          ['template-2', 0],
        ]);
      });

      it('counts rules once, for the templates on the page only', async () => {
        const savedObjectsClient = savedObjectsClientMock.create();
        savedObjectsClient.find.mockResolvedValue({
          ...findResponse(['valid']),
          saved_objects: [
            ...findResponse(['valid']).saved_objects,
            {
              id: 'invalid',
              type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
              attributes: { engine: 'v2', rule: { kind: 'alert' } },
              references: [],
              score: 1,
            },
          ],
          total: 2,
        });
        const { client, rulesClient } = createClient(savedObjectsClient);

        await client.findRuleTemplates();

        expect(rulesClient.getRuleCountsByTemplateId).toHaveBeenCalledTimes(1);
        expect(rulesClient.getRuleCountsByTemplateId).toHaveBeenCalledWith(['valid']);
      });

      it('lists the templates without rule_count and logs when counting the rules fails', async () => {
        const savedObjectsClient = savedObjectsClientMock.create();
        savedObjectsClient.find.mockResolvedValue(findResponse(['template-1']));
        const { client, rulesClient, mockLogger } = createClient(savedObjectsClient);
        rulesClient.getRuleCountsByTemplateId.mockRejectedValue(new Error('Unavailable'));

        const result = await client.findRuleTemplates();

        expect(result.items).toEqual([{ id: 'template-1', ...validTemplateAttributes }]);
        expect(result.items[0]).not.toHaveProperty('rule_count');
        expect(result.total).toBe(1);
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Failed to count the rules created from each rule template',
          expect.objectContaining({
            labels: { code: ALERTING_LOG_CODES.RULE_TEMPLATE_RULE_COUNT_FAILED },
          })
        );
      });
    });

    it('forwards search, tags, sort, and paging to the saved objects client', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.find.mockResolvedValue({
        saved_objects: [],
        total: 0,
        page: 2,
        per_page: 10,
      });

      const { client } = createClient(savedObjectsClient);
      await client.findRuleTemplates({
        page: 2,
        perPage: 10,
        search: 'crash',
        sortField: 'tags',
        sortOrder: 'desc',
        tags: ['Kubernetes', 'production'],
        excludedTags: ['deprecated'],
      });

      expect(savedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          perPage: 10,
          search: 'crash*',
          searchFields: ['rule.metadata.name', 'rule.metadata.description'],
          defaultSearchOperator: 'AND',
          sortField: 'rule.metadata.tags',
          sortOrder: 'desc',
          filter: nodeBuilder.and([
            nodeBuilder.is(`${RULE_TEMPLATE_SAVED_OBJECT_TYPE}.attributes.engine`, 'v2'),
            nodeBuilder.or([
              nodeBuilder.is(
                `${RULE_TEMPLATE_SAVED_OBJECT_TYPE}.attributes.rule.metadata.tags`,
                'Kubernetes'
              ),
              nodeBuilder.is(
                `${RULE_TEMPLATE_SAVED_OBJECT_TYPE}.attributes.rule.metadata.tags`,
                'production'
              ),
            ]),
            nodeTypes.function.buildNode(
              'not',
              nodeBuilder.is(
                `${RULE_TEMPLATE_SAVED_OBJECT_TYPE}.attributes.rule.metadata.tags`,
                'deprecated'
              )
            ),
          ]),
        })
      );
    });

    it('omits invalid templates from items, logs, and keeps the elasticsearch total', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: 'valid',
            type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
            attributes: validTemplateAttributes,
            references: [],
            score: 1,
          },
          {
            id: 'invalid',
            type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
            attributes: { engine: 'v2', rule: { kind: 'alert' } },
            references: [],
            score: 1,
          },
        ],
        total: 2,
        page: 1,
        per_page: 20,
      });

      const { client, mockLogger } = createClient(savedObjectsClient);
      const result = await client.findRuleTemplates();

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('valid');
      expect(result.total).toBe(2);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Rule template failed schema validation',
        expect.objectContaining({
          labels: {
            code: ALERTING_LOG_CODES.RULE_TEMPLATE_VALIDATION_FAILED,
            rule_template_id: 'invalid',
          },
        })
      );
    });
  });

  describe('getRuleTemplate', () => {
    it('returns a transformed template', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.get.mockResolvedValue({
        id: 'template-1',
        type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
        attributes: validTemplateAttributes,
        references: [],
      });

      const { client } = createClient(savedObjectsClient);
      const result = await client.getRuleTemplate({ id: 'template-1' });

      expect(savedObjectsClient.get).toHaveBeenCalledWith(
        RULE_TEMPLATE_SAVED_OBJECT_TYPE,
        'template-1'
      );
      expect(result).toEqual({ id: 'template-1', ...validTemplateAttributes });
    });

    it('throws RULE_TEMPLATE_NOT_FOUND when the saved object is missing', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          RULE_TEMPLATE_SAVED_OBJECT_TYPE,
          'missing'
        )
      );

      const { client } = createClient(savedObjectsClient);

      await expect(client.getRuleTemplate({ id: 'missing' })).rejects.toMatchObject({
        output: {
          statusCode: 404,
          payload: expect.objectContaining({
            message: 'Rule template with id "missing" not found',
          }),
        },
        data: {
          code: ALERTING_ERROR_CODES.RULE_TEMPLATE_NOT_FOUND,
          details: { rule_template_id: 'missing' },
        },
      });
    });

    it('throws RULE_TEMPLATE_NOT_FOUND and logs when stored attributes are invalid', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.get.mockResolvedValue({
        id: 'classic-template',
        type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
        attributes: {
          name: 'classic template',
          ruleTypeId: '.test',
          engine: 'v1',
        },
        references: [],
      });

      const { client, mockLogger } = createClient(savedObjectsClient);

      await expect(client.getRuleTemplate({ id: 'classic-template' })).rejects.toMatchObject({
        data: {
          code: ALERTING_ERROR_CODES.RULE_TEMPLATE_NOT_FOUND,
          details: { rule_template_id: 'classic-template' },
        },
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Rule template failed schema validation',
        expect.objectContaining({
          labels: {
            code: ALERTING_LOG_CODES.RULE_TEMPLATE_VALIDATION_FAILED,
            rule_template_id: 'classic-template',
          },
        })
      );
    });
  });

  describe('installRuleTemplate', () => {
    const data = {
      ...validTemplateAttributes.rule,
      metadata: { name: 'Pod CrashLoopBackOff (edited)' },
    } as CreateRuleData;
    const createdRule = { id: 'rule-1' } as RuleResponse;

    const clientWithTemplate = () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.get.mockResolvedValue({
        id: 'template-1',
        type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
        attributes: validTemplateAttributes,
        references: [],
      });
      return createClient(savedObjectsClient);
    };

    it('creates the rule from the request body and records the template id', async () => {
      const { client, rulesClient } = clientWithTemplate();
      rulesClient.createRule.mockResolvedValue(createdRule);

      await expect(client.installRuleTemplate({ id: 'template-1', data })).resolves.toBe(
        createdRule
      );

      expect(rulesClient.createRule).toHaveBeenCalledTimes(1);
      expect(rulesClient.createRule).toHaveBeenCalledWith({
        data,
        options: { template: { id: 'template-1' } },
      });
    });

    it('does not create a rule when the template does not exist', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          RULE_TEMPLATE_SAVED_OBJECT_TYPE,
          'missing'
        )
      );
      const { client, rulesClient } = createClient(savedObjectsClient);

      await expect(client.installRuleTemplate({ id: 'missing', data })).rejects.toMatchObject({
        output: { statusCode: 404 },
        data: { code: ALERTING_ERROR_CODES.RULE_TEMPLATE_NOT_FOUND },
      });
      expect(rulesClient.createRule).not.toHaveBeenCalled();
    });

    it('does not create a rule when the stored template is unusable', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.get.mockResolvedValue({
        id: 'broken-template',
        type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
        attributes: { engine: 'v2', rule: { kind: 'alert' } },
        references: [],
      });
      const { client, rulesClient } = createClient(savedObjectsClient);

      await expect(
        client.installRuleTemplate({ id: 'broken-template', data })
      ).rejects.toMatchObject({
        data: { code: ALERTING_ERROR_CODES.RULE_TEMPLATE_NOT_FOUND },
      });
      expect(rulesClient.createRule).not.toHaveBeenCalled();
    });

    it('propagates rule creation failures', async () => {
      const { client, rulesClient } = clientWithTemplate();
      rulesClient.createRule.mockRejectedValue(new Error('Invalid rule'));

      await expect(client.installRuleTemplate({ id: 'template-1', data })).rejects.toThrow(
        'Invalid rule'
      );
    });
  });
});
