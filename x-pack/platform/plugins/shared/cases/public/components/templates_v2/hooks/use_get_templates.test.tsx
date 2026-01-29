/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';

import { TestProviders, createTestQueryClient } from '../../../common/mock';
import { useGetTemplates } from './use_get_templates';
import { casesQueriesKeys } from '../../../containers/constants';
import * as api from '../api/api';

jest.mock('../api/api');

const apiMock = api as jest.Mocked<typeof api>;

describe('useGetTemplates', () => {
  const mockTemplatesResponse = {
    templates: [
      {
        key: 'template-1',
        name: 'Template 1',
        description: 'Description 1',
        solution: 'security' as const,
        fields: 5,
        tags: ['tag1'],
        lastUpdate: '2024-01-01T00:00:00.000Z',
        lastTimeUsed: '2024-01-01T00:00:00.000Z',
        usage: 10,
        isDefault: false,
      },
    ],
    page: 1,
    perPage: 10,
    total: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    apiMock.getTemplates.mockResolvedValue(mockTemplatesResponse);
  });

  it('fetches templates successfully', async () => {
    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useGetTemplates(), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders queryClient={queryClient}>{children}</TestProviders>
      ),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockTemplatesResponse);
  });

  it('calls getTemplates with default query params', async () => {
    const queryClient = createTestQueryClient();

    renderHook(() => useGetTemplates(), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders queryClient={queryClient}>{children}</TestProviders>
      ),
    });

    await waitFor(() => {
      expect(apiMock.getTemplates).toHaveBeenCalled();
    });

    expect(apiMock.getTemplates).toHaveBeenCalledWith({
      signal: expect.any(AbortSignal),
      queryParams: {
        page: 1,
        perPage: 10,
        sortField: 'name',
        sortOrder: 'asc',
        search: '',
      },
    });
  });

  it('calls getTemplates with custom query params', async () => {
    const queryClient = createTestQueryClient();

    renderHook(
      () =>
        useGetTemplates({
          queryParams: {
            page: 2,
            perPage: 25,
            search: 'test',
            sortField: 'lastUpdate',
            sortOrder: 'desc',
          },
        }),
      {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders queryClient={queryClient}>{children}</TestProviders>
        ),
      }
    );

    await waitFor(() => {
      expect(apiMock.getTemplates).toHaveBeenCalled();
    });

    expect(apiMock.getTemplates).toHaveBeenCalledWith({
      signal: expect.any(AbortSignal),
      queryParams: {
        page: 2,
        perPage: 25,
        search: 'test',
        sortField: 'lastUpdate',
        sortOrder: 'desc',
      },
    });
  });

  it('merges partial query params with defaults', async () => {
    const queryClient = createTestQueryClient();

    renderHook(
      () =>
        useGetTemplates({
          queryParams: {
            search: 'partial search',
          },
        }),
      {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders queryClient={queryClient}>{children}</TestProviders>
        ),
      }
    );

    await waitFor(() => {
      expect(apiMock.getTemplates).toHaveBeenCalled();
    });

    expect(apiMock.getTemplates).toHaveBeenCalledWith({
      signal: expect.any(AbortSignal),
      queryParams: {
        page: 1,
        perPage: 10,
        sortField: 'name',
        sortOrder: 'asc',
        search: 'partial search',
      },
    });
  });

  describe('casesQueriesKeys for templates', () => {
    it('generates correct query keys', () => {
      expect(casesQueriesKeys.templates).toEqual(['templates']);
      expect(casesQueriesKeys.templatesList()).toEqual(['templates', 'list']);
      expect(casesQueriesKeys.templatesAll({ page: 1 })).toEqual([
        'templates',
        'list',
        { page: 1 },
      ]);
    });
  });
});
