/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useService } from '@kbn/core-di-browser';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { RuleTemplatesApi } from '../services/rule_templates_api';
import { useFetchRuleTemplateTags } from './use_fetch_rule_template_tags';

jest.mock('@kbn/core-di-browser', () => ({
  ...jest.requireActual('@kbn/core-di-browser'),
  useService: jest.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 0 } },
    logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useFetchRuleTemplateTags', () => {
  const api = new RuleTemplatesApi(httpServiceMock.createStartContract());
  const listTags = jest.spyOn(api, 'listTags');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useService).mockReturnValue(api);
  });

  it('unwraps tags and forwards the search prefix', async () => {
    listTags.mockResolvedValue({ tags: ['production'] });
    const { result } = renderHook(() => useFetchRuleTemplateTags({ search: 'pro' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toEqual(['production']));
    expect(listTags).toHaveBeenCalledWith({ search: 'pro' });
  });

  it('fetches without a search prefix by default', async () => {
    listTags.mockResolvedValue({ tags: [] });
    const { result } = renderHook(() => useFetchRuleTemplateTags(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toEqual([]));
    expect(listTags).toHaveBeenCalledWith({ search: undefined });
  });

  it('does not fetch when disabled', () => {
    renderHook(() => useFetchRuleTemplateTags({ enabled: false }), { wrapper: createWrapper() });
    expect(listTags).not.toHaveBeenCalled();
  });

  it('keeps different search results separate in the same cache', async () => {
    listTags.mockImplementation(async ({ search } = {}) => ({
      tags: search === 'pro' ? ['production'] : ['staging'],
    }));
    const { result } = renderHook(
      () => ({
        production: useFetchRuleTemplateTags({ search: 'pro' }),
        staging: useFetchRuleTemplateTags({ search: 'sta' }),
      }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.production.data).toEqual(['production']);
      expect(result.current.staging.data).toEqual(['staging']);
    });
    expect(listTags).toHaveBeenCalledTimes(2);
  });

  it('exposes API errors without retrying', async () => {
    const error = new Error('Unavailable');
    listTags.mockRejectedValue(error);
    const { result } = renderHook(() => useFetchRuleTemplateTags(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(error);
    expect(listTags).toHaveBeenCalledTimes(1);
  });
});
