/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { nodeBuilder } from '@kbn/es-query';
import { RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '../../../common/saved_object_types';
import { ALERTING_ERROR_CODES, ALERTING_LOG_CODES } from '../errors/error_codes';
import { createLoggerService } from '../services/logger_service/logger_service.mock';
import { RuleTemplatesClient } from './rule_templates_client';

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
    state_transition: {
      pending_count: 3,
    },
    recovery_strategy: 'no_breach' as const,
    query: {
      format: 'composed' as const,
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
  const client = new RuleTemplatesClient(savedObjectsClient, loggerService);
  return { client, savedObjectsClient, loggerService, mockLogger };
};

describe('RuleTemplatesClient', () => {
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
        items: [{ id: 'template-1', ...validTemplateAttributes }],
        total: 1,
        page: 1,
        per_page: 20,
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
});
