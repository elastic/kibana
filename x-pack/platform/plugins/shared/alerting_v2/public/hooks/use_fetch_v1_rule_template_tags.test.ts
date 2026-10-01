/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { findRuleTemplates } from '@kbn/response-ops-rules-apis/apis/find_rule_templates';
import {
  collectV1RuleTemplateTags,
  useFetchV1RuleTemplateTags,
} from './use_fetch_v1_rule_template_tags';

jest.mock('@kbn/response-ops-rules-apis/apis/find_rule_templates', () => ({
  findRuleTemplates: jest.fn(),
}));

jest.mock('@kbn/core-di-browser', () => ({
  useService: () => ({ get: jest.fn() }),
  CoreStart: (key: string) => key,
}));

const mockFindRuleTemplates = findRuleTemplates as jest.MockedFunction<typeof findRuleTemplates>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 0 } },
    logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('collectV1RuleTemplateTags', () => {
  it('keeps tags that match the search and drops tags that only matched a template name', () => {
    expect(
      collectV1RuleTemplateTags(
        [
          { id: '1', name: 'prod cpu', ruleTypeId: '.es-query', tags: ['infra'] },
          { id: '2', name: 'disk', ruleTypeId: '.es-query', tags: ['prod', 'Prod-west'] },
        ],
        'prod'
      )
    ).toEqual(['prod', 'Prod-west']);
  });
});

describe('useFetchV1RuleTemplateTags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads tags from the classic find API', async () => {
    mockFindRuleTemplates.mockResolvedValue({
      data: [{ id: '1', name: 'CPU usage', ruleTypeId: '.es-query', tags: ['prod', 'infra'] }],
      total: 1,
      page: 1,
      perPage: 100,
    });
    const { result } = renderHook(() => useFetchV1RuleTemplateTags({ search: 'pro' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toEqual(['prod']));
    expect(mockFindRuleTemplates).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, perPage: 100, search: 'pro' })
    );
  });
});
