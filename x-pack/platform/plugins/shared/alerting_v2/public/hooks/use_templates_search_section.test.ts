/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useService } from '@kbn/core-di-browser';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { MAX_SEARCH_LENGTH } from '@kbn/alerting-v2-schemas';
import type { FindRuleTemplatesResponse, RuleTemplateResponse } from '@kbn/alerting-v2-schemas';
import { MAX_RESULTS_PER_SECTION } from '../components/rule_create_search';
import { RuleTemplatesApi } from '../services/rule_templates_api';
import { UserCapabilities } from '../services/user_capabilities';
import { useTemplatesSearchSection } from './use_templates_search_section';

jest.mock('@kbn/core-di-browser', () => ({
  ...jest.requireActual('@kbn/core-di-browser'),
  useService: jest.fn(),
}));

const createTemplate = (
  id: string,
  name: string,
  description?: string | null
): RuleTemplateResponse =>
  ({
    id,
    engine: 'v2',
    rule: {
      kind: 'alert',
      metadata: {
        name,
        ...(description !== undefined ? { description } : {}),
      },
      schedule: { every: '1m' },
      query: { base: 'FROM logs-*' },
      time_field: '@timestamp',
    },
  } as RuleTemplateResponse);

const createResponse = (items: RuleTemplateResponse[]): FindRuleTemplatesResponse => ({
  items,
  total: items.length,
  page: 1,
  per_page: MAX_RESULTS_PER_SECTION,
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 0 } },
    logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useTemplatesSearchSection', () => {
  const api = new RuleTemplatesApi(httpServiceMock.createStartContract());
  const listRuleTemplates = jest.spyOn(api, 'listRuleTemplates');
  const onSelectTemplate = jest.fn();
  let canWriteRules = true;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    canWriteRules = true;
    jest.mocked(useService).mockImplementation((token: unknown) => {
      if (token === UserCapabilities) {
        return {
          canWrite: (feature: string) => (feature === 'rules' ? canWriteRules : true),
        };
      }
      if (token === RuleTemplatesApi) {
        return api;
      }
      return {};
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns an empty result without fetching when the query is empty or whitespace', () => {
    const { result, rerender } = renderHook(
      ({ query }) => useTemplatesSearchSection(query, { onSelectTemplate }),
      {
        initialProps: { query: '' },
        wrapper: createWrapper(),
      }
    );

    expect(result.current).toEqual({ items: [], isLoading: false });
    expect(listRuleTemplates).not.toHaveBeenCalled();

    rerender({ query: '   ' });
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current).toEqual({ items: [], isLoading: false });
    expect(listRuleTemplates).not.toHaveBeenCalled();
  });

  it('hides the section without fetching when the user cannot write v2 rules', () => {
    canWriteRules = false;

    const { result } = renderHook(() => useTemplatesSearchSection('cpu', { onSelectTemplate }), {
      wrapper: createWrapper(),
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current).toEqual({ items: [], isLoading: false });
    expect(listRuleTemplates).not.toHaveBeenCalled();
  });

  it('skips fetching when the query exceeds MAX_SEARCH_LENGTH', () => {
    const longQuery = 'a'.repeat(MAX_SEARCH_LENGTH + 1);

    const { result } = renderHook(
      () => useTemplatesSearchSection(longQuery, { onSelectTemplate }),
      { wrapper: createWrapper() }
    );

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current).toEqual({ items: [], isLoading: false });
    expect(listRuleTemplates).not.toHaveBeenCalled();
  });

  it('debounces the query and shows loading before fetching', async () => {
    const template = createTemplate('tpl-cpu', 'High CPU', 'CPU usage is high');
    listRuleTemplates.mockResolvedValue(createResponse([template]));

    const { result, rerender } = renderHook(
      ({ query }) => useTemplatesSearchSection(query, { onSelectTemplate }),
      {
        initialProps: { query: '' },
        wrapper: createWrapper(),
      }
    );

    rerender({ query: '  cpu  ' });

    expect(result.current).toEqual({ items: [], isLoading: true });
    expect(listRuleTemplates).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(listRuleTemplates).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(listRuleTemplates).toHaveBeenCalledTimes(1);
    expect(listRuleTemplates).toHaveBeenCalledWith({
      page: 1,
      per_page: MAX_RESULTS_PER_SECTION,
      search: 'cpu',
      tags: undefined,
      sort_field: undefined,
      sort_order: undefined,
    });
    expect(result.current.items).toHaveLength(1);
  });

  it('maps templates to search items without headerAction and invokes onSelectTemplate', async () => {
    const withDescription = createTemplate('tpl-1', 'High CPU', 'Monitors host CPU');
    const withoutDescription = createTemplate('tpl-2', 'Error spike', null);
    listRuleTemplates.mockResolvedValue(createResponse([withDescription, withoutDescription]));

    const { result } = renderHook(() => useTemplatesSearchSection('cpu', { onSelectTemplate }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.items).toHaveLength(2));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeUndefined();
    expect(result.current.headerAction).toBeUndefined();
    expect(result.current.items[0]).toMatchObject({
      id: 'tpl-1',
      title: 'High CPU',
      description: 'Monitors host CPU',
    });
    expect(result.current.items[1]).toMatchObject({
      id: 'tpl-2',
      title: 'Error spike',
      description: undefined,
    });

    result.current.items[0].onSelect();
    expect(onSelectTemplate).toHaveBeenCalledTimes(1);
    expect(onSelectTemplate).toHaveBeenCalledWith(withDescription);
  });

  it('exposes the error so the section hides on a 403 or request failure', async () => {
    const error = new Error('Forbidden (403)');
    listRuleTemplates.mockRejectedValue(error);

    const { result } = renderHook(() => useTemplatesSearchSection('cpu', { onSelectTemplate }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.error).toBe(error));
    expect(result.current).toEqual({ items: [], isLoading: false, error });
    expect(listRuleTemplates).toHaveBeenCalledTimes(1);
  });

  it('does not let an older slow response overwrite a newer query result', async () => {
    let resolveFirst!: (value: FindRuleTemplatesResponse) => void;
    let resolveSecond!: (value: FindRuleTemplatesResponse) => void;

    listRuleTemplates
      .mockImplementationOnce(
        () =>
          new Promise<FindRuleTemplatesResponse>((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise<FindRuleTemplatesResponse>((resolve) => {
            resolveSecond = resolve;
          })
      );

    const { result, rerender } = renderHook(
      ({ query }) => useTemplatesSearchSection(query, { onSelectTemplate }),
      {
        initialProps: { query: 'cp' },
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(listRuleTemplates).toHaveBeenCalledTimes(1));

    rerender({ query: 'cpu' });
    act(() => {
      jest.advanceTimersByTime(300);
    });
    await waitFor(() => expect(listRuleTemplates).toHaveBeenCalledTimes(2));

    await act(async () => {
      resolveSecond(createResponse([createTemplate('tpl-new', 'High CPU')]));
    });
    await waitFor(() => expect(result.current.items.map((item) => item.id)).toEqual(['tpl-new']));

    await act(async () => {
      resolveFirst(createResponse([createTemplate('tpl-old', 'CP stale')]));
    });

    expect(result.current.items.map((item) => item.id)).toEqual(['tpl-new']);
  });
});
