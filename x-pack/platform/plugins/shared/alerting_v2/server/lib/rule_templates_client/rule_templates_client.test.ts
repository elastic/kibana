/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import {
  RULE_TEMPLATE_SAVED_OBJECT_TYPE,
  type RuleTemplateSavedObjectAttributes,
} from '../../saved_objects';
import { RuleTemplatesClient } from './rule_templates_client';

const validTemplateAttributes = {
  engine: 'v2' as const,
  rule: {
    kind: 'alert' as const,
    metadata: {
      name: 'Template rule',
      tags: ['test'],
    },
    schedule: {
      every: '1m',
    },
    query: {
      format: 'standalone' as const,
      breach: {
        query: 'FROM logs-* | KEEP @timestamp | LIMIT 1',
      },
    },
    time_field: '@timestamp',
  },
};

describe('RuleTemplatesClient', () => {
  const savedObjectsClient = savedObjectsClientMock.create();
  let client: RuleTemplatesClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new RuleTemplatesClient(savedObjectsClient);
  });

  describe('create', () => {
    it('validates with Zod and creates the saved object', async () => {
      savedObjectsClient.create.mockResolvedValue({
        id: 'template-1',
        type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
        attributes: validTemplateAttributes as RuleTemplateSavedObjectAttributes,
        references: [],
        version: 'WzEsMV0=',
      });

      const result = await client.create({ attributes: validTemplateAttributes, id: 'template-1' });

      expect(savedObjectsClient.create).toHaveBeenCalledWith(
        RULE_TEMPLATE_SAVED_OBJECT_TYPE,
        {
          engine: 'v2',
          rule: expect.objectContaining({
            kind: 'alert',
            metadata: expect.objectContaining({ name: 'Template rule' }),
          }),
        },
        { id: 'template-1' }
      );
      expect(result).toEqual({
        id: 'template-1',
        attributes: expect.objectContaining({
          engine: 'v2',
          rule: expect.objectContaining({ kind: 'alert' }),
        }),
        version: 'WzEsMV0=',
      });
    });

    it('rejects invalid attributes before calling saved objects', async () => {
      await expect(
        client.create({
          attributes: {
            engine: 'v2',
            ...validTemplateAttributes.rule,
          },
        })
      ).rejects.toMatchObject({
        isBoom: true,
        output: { statusCode: 400 },
      });

      expect(savedObjectsClient.create).not.toHaveBeenCalled();
    });

    it('maps saved-object conflicts to 409', async () => {
      savedObjectsClient.create.mockRejectedValue(
        SavedObjectsErrorHelpers.createConflictError(RULE_TEMPLATE_SAVED_OBJECT_TYPE, 'template-1')
      );

      await expect(
        client.create({ attributes: validTemplateAttributes, id: 'template-1' })
      ).rejects.toMatchObject({
        isBoom: true,
        output: { statusCode: 409 },
      });
    });
  });

  describe('get', () => {
    it('returns a parsed template', async () => {
      savedObjectsClient.get.mockResolvedValue({
        id: 'template-1',
        type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
        attributes: validTemplateAttributes as RuleTemplateSavedObjectAttributes,
        references: [],
        version: 'WzEsMV0=',
      });

      const result = await client.get('template-1');

      expect(savedObjectsClient.get).toHaveBeenCalledWith(
        RULE_TEMPLATE_SAVED_OBJECT_TYPE,
        'template-1'
      );
      expect(result.id).toBe('template-1');
      expect(result.attributes.engine).toBe('v2');
      expect(result.attributes.rule.metadata.name).toBe('Template rule');
    });

    it('maps missing templates to 404', async () => {
      savedObjectsClient.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          RULE_TEMPLATE_SAVED_OBJECT_TYPE,
          'missing'
        )
      );

      await expect(client.get('missing')).rejects.toMatchObject({
        isBoom: true,
        output: { statusCode: 404 },
      });
    });
  });
});
