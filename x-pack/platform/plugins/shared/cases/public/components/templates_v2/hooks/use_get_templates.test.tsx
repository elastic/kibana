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
        templateId: 'template-1',
        name: 'Template 1',
        owner: 'securitySolution',
        definition: 'fields:\n  - name: field1\n    type: keyword',
        templateVersion: 1,
        deletedAt: null,
        description: 'Description 1',
        fieldCount: 5,
        tags: ['tag1'],
        author: 'user1',
        lastUsedAt: '2024-01-01T00:00:00.000Z',
        usageCount: 10,
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
        tags: [],
        author: [],
        isDeleted: false,
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
            sortField: 'lastUsedAt',
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
        sortField: 'lastUsedAt',
        sortOrder: 'desc',
        tags: [],
        author: [],
        isDeleted: false,
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
        tags: [],
        author: [],
        isDeleted: false,
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
