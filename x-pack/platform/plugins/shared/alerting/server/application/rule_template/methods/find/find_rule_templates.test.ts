/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findRuleTemplates } from './find_rule_templates';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { alertingAuthorizationMock } from '../../../../authorization/alerting_authorization.mock';
import type { RulesClientContext } from '../../../../rules_client/types';
import { RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';

import type { AlertingAuthorization } from '../../../../authorization/alerting_authorization';

const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const authorization = alertingAuthorizationMock.create();

const rulesClientContext = {
  unsecuredSavedObjectsClient,
  authorization: authorization as unknown as AlertingAuthorization,
  logger: loggingSystemMock.create().get(),
} as unknown as RulesClientContext;

beforeEach(() => {
  jest.resetAllMocks();
});

describe('findRuleTemplates', () => {
  const mockTemplate1 = {
    id: 'template-1',
    type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
    attributes: {
      name: 'Template 1',
      ruleTypeId: 'test.rule.type',
      schedule: { interval: '1m' },
      params: { foo: 'bar' },
      tags: ['tag1'],
    },
    score: 1,
    references: [],
  };

  const mockTemplate2 = {
    id: 'template-2',
    type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
    attributes: {
      name: 'Template 2',
      ruleTypeId: 'another.rule.type',
      schedule: { interval: '5m' },
      params: { baz: 123 },
      tags: ['tag2'],
    },
    score: 1,
    references: [],
  };

  test('finds rule templates with proper parameters', async () => {
    unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
      total: 2,
      per_page: 10,
      page: 1,
      saved_objects: [mockTemplate1, mockTemplate2],
    });

    const result = await findRuleTemplates(rulesClientContext, {
      perPage: 10,
      page: 1,
    });

    expect(result).toEqual({
      page: 1,
      perPage: 10,
      total: 2,
      data: [
        {
          id: 'template-1',
          name: 'Template 1',
          ruleTypeId: 'test.rule.type',
          schedule: { interval: '1m' },
          params: { foo: 'bar' },
          tags: ['tag1'],
        },
        {
          id: 'template-2',
          name: 'Template 2',
          ruleTypeId: 'another.rule.type',
          schedule: { interval: '5m' },
          params: { baz: 123 },
          tags: ['tag2'],
        },
      ],
    });

    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledWith({
      type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
      page: 1,
      perPage: 10,
      search: undefined,
      searchFields: ['name', 'tags'],
      defaultSearchOperator: undefined,
      sortField: undefined,
      sortOrder: undefined,
      filter: undefined,
    });
  });

  test('filters by specific rule type', async () => {
    unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
      total: 1,
      per_page: 10,
      page: 1,
      saved_objects: [mockTemplate1],
    });

    const result = await findRuleTemplates(rulesClientContext, {
      perPage: 10,
      page: 1,
      ruleTypeId: 'test.rule.type',
    });

    expect(result.total).toBe(1);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].ruleTypeId).toBe('test.rule.type');
    
    // Verify the filter was built correctly for the rule type
    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: expect.any(Object),
      })
    );
  });

  test('filters by tags', async () => {
    unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
      total: 1,
      per_page: 10,
      page: 1,
      saved_objects: [mockTemplate1],
    });

    const result = await findRuleTemplates(rulesClientContext, {
      perPage: 10,
      page: 1,
      tags: ['tag1'],
    });

    expect(result.total).toBe(1);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].tags).toContain('tag1');
    
    // Verify the filter was built correctly for tags
    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: expect.any(Object),
      })
    );
  });

  test('filters by multiple tags', async () => {
    unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
      total: 2,
      per_page: 10,
      page: 1,
      saved_objects: [mockTemplate1, mockTemplate2],
    });

    await findRuleTemplates(rulesClientContext, {
      perPage: 10,
      page: 1,
      tags: ['tag1', 'tag2'],
    });

    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: expect.any(Object),
      })
    );
  });

  test('combines ruleTypeId and tags filters', async () => {
    unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
      total: 1,
      per_page: 10,
      page: 1,
      saved_objects: [mockTemplate1],
    });

    await findRuleTemplates(rulesClientContext, {
      perPage: 10,
      page: 1,
      ruleTypeId: 'test.rule.type',
      tags: ['tag1'],
    });

    // Verify both filters are combined
    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: expect.any(Object),
      })
    );
  });

  test('applies search and sort parameters', async () => {
    unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
      total: 1,
      per_page: 5,
      page: 2,
      saved_objects: [mockTemplate1],
    });

    await findRuleTemplates(rulesClientContext, {
      perPage: 5,
      page: 2,
      search: 'my template',
      defaultSearchOperator: 'AND',
      sortField: 'name',
      sortOrder: 'desc',
    });

    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledWith({
      type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
      page: 2,
      perPage: 5,
      search: 'my template',
      searchFields: ['name', 'tags'],
      defaultSearchOperator: 'AND',
      sortField: 'name.keyword',
      sortOrder: 'desc',
      filter: undefined,
    });
  });

  test('applies OR search operator', async () => {
    unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
      total: 1,
      per_page: 10,
      page: 1,
      saved_objects: [mockTemplate1],
    });

    await findRuleTemplates(rulesClientContext, {
      perPage: 10,
      page: 1,
      search: 'template',
      defaultSearchOperator: 'OR',
    });

    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'template',
        defaultSearchOperator: 'OR',
      })
    );
  });

  test('applies ascending sort order', async () => {
    unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
      total: 1,
      per_page: 10,
      page: 1,
      saved_objects: [mockTemplate1],
    });

    await findRuleTemplates(rulesClientContext, {
      perPage: 10,
      page: 1,
      sortField: 'name',
      sortOrder: 'asc',
    });

    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        sortField: 'name.keyword',
        sortOrder: 'asc',
      })
    );
  });

  test('handles errors from saved objects client', async () => {
    const error = new Error('Something went wrong');
    unsecuredSavedObjectsClient.find.mockRejectedValueOnce(error);

    await expect(
      findRuleTemplates(rulesClientContext, {
        perPage: 10,
        page: 1,
      })
    ).rejects.toThrow('Something went wrong');
  });

  test('returns empty results when no templates found', async () => {
    unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
      total: 0,
      per_page: 10,
      page: 1,
      saved_objects: [],
    });

    const result = await findRuleTemplates(rulesClientContext, {
      perPage: 10,
      page: 1,
    });

    expect(result).toEqual({
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    });
  });
});
