/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { FindItemsParams } from '@kbn/content-list-provider';
import { TAG_FILTER_ID } from '@kbn/content-list-provider';
import { findRuleTemplates } from '@kbn/response-ops-rules-apis/apis/find_rule_templates';
import { useV1RuleTemplatesDataSource } from './v1_rule_templates_data_source';

jest.mock('@kbn/response-ops-rules-apis/apis/find_rule_templates', () => ({
  findRuleTemplates: jest.fn(),
}));

const mockFindRuleTemplates = findRuleTemplates as jest.MockedFunction<typeof findRuleTemplates>;
const mockHttp = { get: jest.fn() };
const mockAddError = jest.fn();

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'http') {
      return mockHttp;
    }
    if (token === 'notifications') {
      return { toasts: { addError: mockAddError } };
    }
    return {};
  },
  CoreStart: (key: string) => key,
}));

const findParams = (overrides: Partial<FindItemsParams> = {}): FindItemsParams => ({
  searchQuery: '',
  filters: {},
  sort: { field: 'title', direction: 'asc' },
  page: { index: 0, size: 20 },
  ...overrides,
});

describe('useV1RuleTemplatesDataSource', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindRuleTemplates.mockResolvedValue({
      data: [
        {
          id: 'template-1',
          name: 'CPU usage',
          description: 'High CPU',
          ruleTypeId: 'metrics.alert.threshold',
          tags: ['prod'],
        },
      ],
      total: 1,
      page: 1,
      perPage: 20,
    });
  });

  it('sends search, tags, and name sort to the classic find API', async () => {
    const { result } = renderHook(() => useV1RuleTemplatesDataSource());

    const response = await result.current.findItems(
      findParams({
        searchQuery: 'cpu',
        filters: { [TAG_FILTER_ID]: { include: ['prod'], exclude: [] } },
        sort: { field: 'title', direction: 'desc' },
        page: { index: 1, size: 10 },
      })
    );

    expect(mockFindRuleTemplates).toHaveBeenCalledWith({
      http: mockHttp,
      page: 2,
      perPage: 10,
      search: 'cpu',
      tags: ['prod'],
      sortField: 'name',
      sortOrder: 'desc',
    });
    expect(response).toEqual({
      total: 1,
      items: [
        {
          id: 'template-1',
          title: 'CPU usage',
          description: 'High CPU',
          tags: ['prod'],
          template: {
            id: 'template-1',
            name: 'CPU usage',
            description: 'High CPU',
            ruleTypeId: 'metrics.alert.threshold',
            tags: ['prod'],
          },
        },
      ],
    });
  });

  it('omits empty search and tags', async () => {
    const { result } = renderHook(() => useV1RuleTemplatesDataSource());

    await result.current.findItems(
      findParams({
        filters: { [TAG_FILTER_ID]: { include: [], exclude: [] } },
      })
    );

    expect(mockFindRuleTemplates).toHaveBeenCalledWith({
      http: mockHttp,
      page: 1,
      perPage: 20,
      search: undefined,
      tags: undefined,
      sortField: 'name',
      sortOrder: 'asc',
    });
  });
});
