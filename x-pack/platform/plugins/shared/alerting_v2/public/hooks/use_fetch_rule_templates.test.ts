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
import type { FindRuleTemplatesResponse, RuleTemplateResponse } from '@kbn/alerting-v2-schemas';
import { RuleTemplatesApi } from '../services/rule_templates_api';
import { useFetchRuleTemplates } from './use_fetch_rule_templates';

jest.mock('@kbn/core-di-browser', () => ({
  ...jest.requireActual('@kbn/core-di-browser'),
  useService: jest.fn(),
}));

const createTemplate = (id: string, name: string): RuleTemplateResponse =>
  ({
    id,
    engine: 'v2',
    rule: {
      kind: 'alert',
      metadata: { name, description: `${name} description` },
      schedule: { every: '1m' },
      query: { base: 'FROM logs-*' },
      time_field: '@timestamp',
    },
  } as RuleTemplateResponse);

const createResponse = (items: RuleTemplateResponse[]): FindRuleTemplatesResponse => ({
  items,
  total: items.length,
  page: 1,
  per_page: 20,
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 0 } },
    logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useFetchRuleTemplates', () => {
  const api = new RuleTemplatesApi(httpServiceMock.createStartContract());
  const listRuleTemplates = jest.spyOn(api, 'listRuleTemplates');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useService).mockReturnValue(api);
  });

  it('forwards params to listRuleTemplates with snake_case pagination and sort keys', async () => {
    const response = createResponse([createTemplate('tpl-1', 'High CPU')]);
    listRuleTemplates.mockResolvedValue(response);

    const { result } = renderHook(
      () =>
        useFetchRuleTemplates({
          page: 2,
          perPage: 10,
          search: 'cpu',
          tags: ['infra'],
          sortField: 'name',
          sortOrder: 'desc',
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.data).toEqual(response));
    expect(listRuleTemplates).toHaveBeenCalledWith({
      page: 2,
      per_page: 10,
      search: 'cpu',
      tags: ['infra'],
      sort_field: 'name',
      sort_order: 'desc',
    });
  });

  it('uses default page and per_page when called without params', async () => {
    const response = createResponse([]);
    listRuleTemplates.mockResolvedValue(response);

    const { result } = renderHook(() => useFetchRuleTemplates(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toEqual(response));
    expect(listRuleTemplates).toHaveBeenCalledWith({
      page: 1,
      per_page: 20,
      search: undefined,
      tags: undefined,
      sort_field: undefined,
      sort_order: undefined,
    });
  });

  it('does not fetch when disabled', () => {
    renderHook(() => useFetchRuleTemplates({ enabled: false }), { wrapper: createWrapper() });

    expect(listRuleTemplates).not.toHaveBeenCalled();
  });

  it('keeps different search results separate in the same cache', async () => {
    const cpuResponse = createResponse([createTemplate('cpu-1', 'High CPU')]);
    const memResponse = createResponse([createTemplate('mem-1', 'High memory')]);
    listRuleTemplates.mockImplementation(async ({ search } = {}) =>
      search === 'cpu' ? cpuResponse : memResponse
    );

    const { result } = renderHook(
      () => ({
        cpu: useFetchRuleTemplates({ search: 'cpu', perPage: 10 }),
        mem: useFetchRuleTemplates({ search: 'mem', perPage: 10 }),
      }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.cpu.data).toEqual(cpuResponse);
      expect(result.current.mem.data).toEqual(memResponse);
    });
    expect(listRuleTemplates).toHaveBeenCalledTimes(2);
  });

  it('exposes API errors without retrying', async () => {
    const error = new Error('Forbidden');
    listRuleTemplates.mockRejectedValue(error);

    const { result } = renderHook(() => useFetchRuleTemplates({ search: 'cpu' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(error);
    expect(listRuleTemplates).toHaveBeenCalledTimes(1);
  });
});
