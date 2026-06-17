/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindRuleTemplatesApiResponse } from './find_rule_templates';
import { findRuleTemplates, rewriteTemplatesBodyRes } from './find_rule_templates';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';

const http = httpServiceMock.createStartContract();

describe('findRuleTemplates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call the find templates API with correct parameters', async () => {
    const mockResponse: FindRuleTemplatesApiResponse = {
      data: [
        {
          id: 'template-1',
          name: 'Template 1',
          tags: ['tag1', 'tag2'],
          rule_type_id: 'rule-type-1',
        },
        {
          id: 'template-2',
          name: 'Template 2',
          tags: ['tag3'],
          rule_type_id: 'rule-type-2',
        },
      ],
      total: 2,
      page: 1,
      per_page: 10,
    };

    http.get.mockResolvedValueOnce(mockResponse);

    const result = await findRuleTemplates({
      http,
      page: 1,
      perPage: 10,
      search: 'test',
      sortField: 'name',
      sortOrder: 'asc',
    });

    expect(result).toEqual({
      data: [
        {
          id: 'template-1',
          name: 'Template 1',
          tags: ['tag1', 'tag2'],
          ruleTypeId: 'rule-type-1',
        },
        {
          id: 'template-2',
          name: 'Template 2',
          tags: ['tag3'],
          ruleTypeId: 'rule-type-2',
        },
      ],
      page: 1,
      perPage: 10,
      total: 2,
    });

    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rule_template/_find",
        Object {
          "query": Object {
            "default_search_operator": undefined,
            "page": 1,
            "per_page": 10,
            "rule_type_id": undefined,
            "search": "test",
            "sort_field": "name",
            "sort_order": "asc",
            "tags": undefined,
          },
        },
      ]
    `);
  });

  it('should handle optional parameters', async () => {
    const mockResponse: FindRuleTemplatesApiResponse = {
      data: [],
      total: 0,
      page: 1,
      per_page: 20,
    };

    http.get.mockResolvedValueOnce(mockResponse);

    const result = await findRuleTemplates({
      http,
      page: 1,
      perPage: 20,
      defaultSearchOperator: 'AND',
      ruleTypeId: 'specific-rule-type',
      tags: ['production', 'critical'],
    });

    expect(result).toEqual({
      data: [],
      page: 1,
      perPage: 20,
      total: 0,
    });

    expect(http.get).toHaveBeenCalledWith('/internal/alerting/rule_template/_find', {
      query: {
        page: 1,
        per_page: 20,
        search: undefined,
        default_search_operator: 'AND',
        sort_field: undefined,
        sort_order: undefined,
        rule_type_id: 'specific-rule-type',
        tags: ['production', 'critical'],
      },
    });
  });

  it('should handle pagination correctly', async () => {
    const mockResponse: FindRuleTemplatesApiResponse = {
      data: [
        {
          id: 'template-11',
          name: 'Template 11',
          tags: [],
          rule_type_id: 'rule-type-1',
        },
      ],
      total: 25,
      page: 2,
      per_page: 10,
    };

    http.get.mockResolvedValueOnce(mockResponse);

    const result = await findRuleTemplates({
      http,
      page: 2,
      perPage: 10,
    });

    expect(result.page).toBe(2);
    expect(result.perPage).toBe(10);
    expect(result.total).toBe(25);
  });
});

describe('rewriteTemplatesBodyRes', () => {
  it('should transform snake_case API response to camelCase', () => {
    const apiResponse: FindRuleTemplatesApiResponse = {
      data: [
        {
          id: 'template-1',
          name: 'Test Template',
          tags: ['tag1'],
          rule_type_id: 'my-rule-type',
        },
      ],
      total: 1,
      page: 1,
      per_page: 10,
    };

    const result = rewriteTemplatesBodyRes(apiResponse);

    expect(result).toEqual({
      data: [
        {
          id: 'template-1',
          name: 'Test Template',
          tags: ['tag1'],
          ruleTypeId: 'my-rule-type',
        },
      ],
      page: 1,
      perPage: 10,
      total: 1,
    });
  });

  it('should handle empty data array', () => {
    const apiResponse: FindRuleTemplatesApiResponse = {
      data: [],
      total: 0,
      page: 1,
      per_page: 10,
    };

    const result = rewriteTemplatesBodyRes(apiResponse);

    expect(result).toEqual({
      data: [],
      page: 1,
      perPage: 10,
      total: 0,
    });
  });

  it('should handle templates with empty tags', () => {
    const apiResponse: FindRuleTemplatesApiResponse = {
      data: [
        {
          id: 'template-no-tags',
          name: 'No Tags Template',
          tags: [],
          rule_type_id: 'rule-type-1',
        },
      ],
      total: 1,
      page: 1,
      per_page: 10,
    };

    const result = rewriteTemplatesBodyRes(apiResponse);

    expect(result.data[0].tags).toEqual([]);
  });
});
