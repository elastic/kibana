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
import { toKqlExpression } from '@kbn/es-query';

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
  // Default: user has access to all rule types
  authorization.getAllAuthorizedRuleTypesFindOperation.mockResolvedValue(
    new Map([
      ['test.rule.type', { authorizedConsumers: { alerts: { read: true, all: true } } }],
      ['another.rule.type', { authorizedConsumers: { alerts: { read: true, all: true } } }],
    ])
  );
});

describe('findRuleTemplates', () => {
  const mockTemplate1 = {
    id: 'template-1',
    type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
    attributes: {
      name: 'Template 1',
      description: 'My first template',
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
      artifacts: {
        dashboards: [
          {
            id: 'dashboard-1',
          },
        ],
        investigation_guide: {
          blob: 'http://example.com/guide',
        },
      },
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
          description: 'My first template',
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
          artifacts: {
            dashboards: [
              {
                id: 'dashboard-1',
              },
            ],
            investigation_guide: {
              blob: 'http://example.com/guide',
            },
          },
        },
      ],
    });

    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledWith({
      type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
      page: 1,
      perPage: 10,
      search: undefined,
      searchFields: ['name', 'tags', 'description'],
      defaultSearchOperator: undefined,
      sortField: undefined,
      sortOrder: undefined,
      filter: expect.any(Object), // filter tested below
    });

    // filter is the authorized rule types by default
    expect(toKqlExpression(unsecuredSavedObjectsClient.find.mock.calls[0][0].filter)).toBe(
      '(alerting_rule_template.attributes.ruleTypeId: test.rule.type OR ' +
        'alerting_rule_template.attributes.ruleTypeId: another.rule.type)'
    );

    expect(authorization.getAllAuthorizedRuleTypesFindOperation).toHaveBeenCalledWith({
      authorizationEntity: 'rule',
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
      ruleTypeId: 'custom.rule.type',
    });

    expect(result.total).toBe(1);
    expect(result.data).toHaveLength(1);

    // filter is the ruleTypeId combined with the authorized rule types
    expect(toKqlExpression(unsecuredSavedObjectsClient.find.mock.calls[0][0].filter)).toBe(
      '(alerting_rule_template.attributes.ruleTypeId: custom.rule.type AND ' +
        '(alerting_rule_template.attributes.ruleTypeId: test.rule.type OR ' +
        'alerting_rule_template.attributes.ruleTypeId: another.rule.type))'
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

    // filter is the tags combined with the authorized rule types
    expect(toKqlExpression(unsecuredSavedObjectsClient.find.mock.calls[0][0].filter)).toBe(
      '(alerting_rule_template.attributes.tags: tag1 AND ' +
        '(alerting_rule_template.attributes.ruleTypeId: test.rule.type OR ' +
        'alerting_rule_template.attributes.ruleTypeId: another.rule.type))'
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

    // filter is the tags combined with the authorized rule types
    expect(toKqlExpression(unsecuredSavedObjectsClient.find.mock.calls[0][0].filter)).toBe(
      '((alerting_rule_template.attributes.tags: tag1 OR ' +
        'alerting_rule_template.attributes.tags: tag2) AND ' +
        '(alerting_rule_template.attributes.ruleTypeId: test.rule.type OR ' +
        'alerting_rule_template.attributes.ruleTypeId: another.rule.type))'
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
      ruleTypeId: 'custom.rule.type',
      tags: ['tag1'],
    });

    // filter is the ruleTypeId and tags combined with the authorized rule types
    expect(toKqlExpression(unsecuredSavedObjectsClient.find.mock.calls[0][0].filter)).toBe(
      '((alerting_rule_template.attributes.ruleTypeId: custom.rule.type AND ' +
        'alerting_rule_template.attributes.tags: tag1) AND ' +
        '(alerting_rule_template.attributes.ruleTypeId: test.rule.type OR ' +
        'alerting_rule_template.attributes.ruleTypeId: another.rule.type))'
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
      searchFields: ['name', 'tags', 'description'],
      defaultSearchOperator: 'AND',
      sortField: 'name.keyword',
      sortOrder: 'desc',
      filter: expect.any(Object), // Authorization filter (not tested here)
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

  describe('authorization', () => {
    test('throws 403 when user has no access to any rule types', async () => {
      authorization.getAllAuthorizedRuleTypesFindOperation.mockResolvedValue(new Map());

      await expect(
        findRuleTemplates(rulesClientContext, {
          perPage: 10,
          page: 1,
        })
      ).rejects.toMatchObject({
        output: {
          statusCode: 403,
        },
        message: 'Unauthorized to find rules for any rule types',
      });

      expect(unsecuredSavedObjectsClient.find).not.toHaveBeenCalled();
    });

    test('filters templates to only authorized rule types', async () => {
      // User only has access to test.rule.type
      authorization.getAllAuthorizedRuleTypesFindOperation.mockResolvedValue(
        new Map([
          ['test.rule.type', { authorizedConsumers: { alerts: { read: true, all: true } } }],
        ])
      );

      unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
        total: 1,
        per_page: 10,
        page: 1,
        saved_objects: [mockTemplate1],
      });

      const result = await findRuleTemplates(rulesClientContext, {
        perPage: 10,
        page: 1,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].ruleTypeId).toBe('test.rule.type');

      // Verify authorization filter was applied
      const findCall = unsecuredSavedObjectsClient.find.mock.calls[0][0];
      expect(findCall.filter).toBeDefined();
    });

    test('throws 403 if unauthorized template slips through filter', async () => {
      authorization.getAllAuthorizedRuleTypesFindOperation.mockResolvedValue(
        new Map([
          ['test.rule.type', { authorizedConsumers: { alerts: { read: true, all: true } } }],
        ])
      );

      // Simulating a template with unauthorized rule type slipping through
      unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
        total: 1,
        per_page: 10,
        page: 1,
        saved_objects: [mockTemplate2], // another.rule.type - not authorized
      });

      await expect(
        findRuleTemplates(rulesClientContext, {
          perPage: 10,
          page: 1,
        })
      ).rejects.toMatchObject({
        output: {
          statusCode: 403,
        },
        message: 'Unauthorized to find rule for rule type "another.rule.type"',
      });
    });

    test('applies authorization filter combined with user filters', async () => {
      authorization.getAllAuthorizedRuleTypesFindOperation.mockResolvedValue(
        new Map([
          ['test.rule.type', { authorizedConsumers: { alerts: { read: true, all: true } } }],
        ])
      );

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

      // Verify that authorization filter is combined with ruleTypeId and tags filters
      const findCall = unsecuredSavedObjectsClient.find.mock.calls[0][0];
      expect(findCall.filter).toBeDefined();
    });

    test('verifies all returned templates are authorized', async () => {
      authorization.getAllAuthorizedRuleTypesFindOperation.mockResolvedValue(
        new Map([
          ['test.rule.type', { authorizedConsumers: { alerts: { read: true, all: true } } }],
          ['another.rule.type', { authorizedConsumers: { alerts: { read: true, all: true } } }],
        ])
      );

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

      // Both templates should pass authorization check
      expect(result.data).toHaveLength(2);
      expect(result.data[0].ruleTypeId).toBe('test.rule.type');
      expect(result.data[1].ruleTypeId).toBe('another.rule.type');
    });
  });
});
