/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';
import { useFindTemplatesQuery } from './use_find_templates_query';
import { findRuleTemplates } from '../apis/find_rule_templates';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { testQueryClientConfig } from '../test_utils';
import type { PropsWithChildren } from 'react';
import React from 'react';

const MOCK_TEMPLATES = [
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
];

jest.mock('../apis/find_rule_templates');
const mockFindRuleTemplates = jest.mocked(findRuleTemplates);

const http = httpServiceMock.createStartContract();
const notifications = notificationServiceMock.createStartContract();

const queryClient = new QueryClient(testQueryClientConfig);

export const Wrapper = ({ children }: PropsWithChildren) => {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe('useFindTemplatesQuery', () => {
  beforeEach(() => {
    mockFindRuleTemplates.mockResolvedValue({
      data: MOCK_TEMPLATES,
      page: 1,
      perPage: 10,
      total: MOCK_TEMPLATES.length,
    });
  });

  afterEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  it('should call the findRuleTemplates API and return templates', async () => {
    const { rerender, result } = renderHook(
      () =>
        useFindTemplatesQuery({
          http,
          toasts: notifications.toasts,
          enabled: true,
          perPage: 10,
          sortField: 'name',
          sortOrder: 'asc',
        }),
      {
        wrapper: Wrapper,
      }
    );

    rerender();
    await waitFor(() => {
      expect(mockFindRuleTemplates).toHaveBeenLastCalledWith(
        expect.objectContaining({
          perPage: 10,
          page: 1,
          sortField: 'name',
          sortOrder: 'asc',
        })
      );

      expect(result.current.templates).toEqual(MOCK_TEMPLATES);
      expect(result.current.totalTemplates).toEqual(2);
      expect(result.current.hasNextPage).toEqual(false);
    });
  });

  it('should support search parameter', async () => {
    const { rerender, result } = renderHook(
      () =>
        useFindTemplatesQuery({
          http,
          toasts: notifications.toasts,
          enabled: true,
          perPage: 10,
          search: 'availability',
        }),
      {
        wrapper: Wrapper,
      }
    );

    rerender();
    await waitFor(() => {
      expect(mockFindRuleTemplates).toHaveBeenLastCalledWith(
        expect.objectContaining({
          search: 'availability',
        })
      );

      expect(result.current.templates).toEqual(MOCK_TEMPLATES);
    });
  });

  it('should support infinite scrolling with pagination', async () => {
    mockFindRuleTemplates.mockResolvedValue({
      data: MOCK_TEMPLATES,
      page: 1,
      perPage: 2,
      total: 10,
    });

    const { rerender, result } = renderHook(
      () =>
        useFindTemplatesQuery({
          http,
          toasts: notifications.toasts,
          enabled: true,
          perPage: 2,
        }),
      {
        wrapper: Wrapper,
      }
    );

    rerender();
    await waitFor(() => {
      expect(mockFindRuleTemplates).toHaveBeenLastCalledWith(
        expect.objectContaining({
          perPage: 2,
          page: 1,
        })
      );

      expect(result.current.templates).toEqual(MOCK_TEMPLATES);
      expect(result.current.hasNextPage).toEqual(true);
      expect(result.current.totalTemplates).toEqual(10);
    });

    // Load next page
    const nextPageTemplates = [
      {
        id: 'template-3',
        name: 'Template 3',
        tags: ['tag4'],
        ruleTypeId: 'rule-type-3',
      },
      {
        id: 'template-4',
        name: 'Template 4',
        tags: ['tag5'],
        ruleTypeId: 'rule-type-4',
      },
    ];

    mockFindRuleTemplates.mockResolvedValue({
      data: nextPageTemplates,
      page: 2,
      perPage: 2,
      total: 10,
    });

    result.current.fetchNextPage();

    rerender();
    await waitFor(() => {
      expect(mockFindRuleTemplates).toHaveBeenLastCalledWith(
        expect.objectContaining({
          perPage: 2,
          page: 2,
        })
      );

      // Templates should be concatenated
      expect(result.current.templates).toEqual([...MOCK_TEMPLATES, ...nextPageTemplates]);
      expect(result.current.hasNextPage).toEqual(true);
    });
  });

  it('should handle empty results', async () => {
    mockFindRuleTemplates.mockResolvedValue({
      data: [],
      page: 1,
      perPage: 10,
      total: 0,
    });

    const { rerender, result } = renderHook(
      () =>
        useFindTemplatesQuery({
          http,
          toasts: notifications.toasts,
          enabled: true,
          perPage: 10,
        }),
      {
        wrapper: Wrapper,
      }
    );

    rerender();
    await waitFor(() => {
      expect(result.current.templates).toEqual([]);
      expect(result.current.totalTemplates).toEqual(0);
      expect(result.current.hasNextPage).toEqual(false);
    });
  });

  it('should not fetch when enabled is false', async () => {
    const { rerender } = renderHook(
      () =>
        useFindTemplatesQuery({
          http,
          toasts: notifications.toasts,
          enabled: false,
          perPage: 10,
        }),
      {
        wrapper: Wrapper,
      }
    );

    rerender();
    await waitFor(() => {
      expect(mockFindRuleTemplates).not.toHaveBeenCalled();
    });
  });

  it('should handle errors and show toast notification', async () => {
    const error = new Error('Failed to fetch templates');
    mockFindRuleTemplates.mockRejectedValue(error);

    const { rerender, result } = renderHook(
      () =>
        useFindTemplatesQuery({
          http,
          toasts: notifications.toasts,
          enabled: true,
          perPage: 10,
        }),
      {
        wrapper: Wrapper,
      }
    );

    rerender();
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
      expect(notifications.toasts.addDanger).toHaveBeenCalledWith({
        title: 'Unable to load rule templates',
        text: 'Failed to fetch templates',
      });
    });
  });

  it('should support filtering by rule type', async () => {
    const { rerender } = renderHook(
      () =>
        useFindTemplatesQuery({
          http,
          toasts: notifications.toasts,
          enabled: true,
          perPage: 10,
          ruleTypeId: 'specific-rule-type',
        }),
      {
        wrapper: Wrapper,
      }
    );

    rerender();
    await waitFor(() => {
      expect(mockFindRuleTemplates).toHaveBeenLastCalledWith(
        expect.objectContaining({
          ruleTypeId: 'specific-rule-type',
        })
      );
    });
  });

  it('should support filtering by tags', async () => {
    const { rerender } = renderHook(
      () =>
        useFindTemplatesQuery({
          http,
          toasts: notifications.toasts,
          enabled: true,
          perPage: 10,
          tags: ['production', 'critical'],
        }),
      {
        wrapper: Wrapper,
      }
    );

    rerender();
    await waitFor(() => {
      expect(mockFindRuleTemplates).toHaveBeenLastCalledWith(
        expect.objectContaining({
          tags: ['production', 'critical'],
        })
      );
    });
  });

  it('should correctly determine hasNextPage when all items are loaded', async () => {
    mockFindRuleTemplates.mockResolvedValue({
      data: MOCK_TEMPLATES,
      page: 1,
      perPage: 10,
      total: 2,
    });

    const { rerender, result } = renderHook(
      () =>
        useFindTemplatesQuery({
          http,
          toasts: notifications.toasts,
          enabled: true,
          perPage: 10,
        }),
      {
        wrapper: Wrapper,
      }
    );

    rerender();
    await waitFor(() => {
      // Loaded 10 items (page 1 * 10 perPage) but total is only 2
      expect(result.current.hasNextPage).toEqual(false);
    });
  });

  it('should handle last page correctly', async () => {
    // Simulating page 3 with 5 items loaded previously (page 1 = 5, page 2 = 5)
    mockFindRuleTemplates.mockResolvedValueOnce({
      data: MOCK_TEMPLATES.slice(0, 1),
      page: 1,
      perPage: 5,
      total: 11,
    });

    const { rerender, result } = renderHook(
      () =>
        useFindTemplatesQuery({
          http,
          toasts: notifications.toasts,
          enabled: true,
          perPage: 5,
        }),
      {
        wrapper: Wrapper,
      }
    );

    rerender();
    await waitFor(() => {
      expect(result.current.hasNextPage).toEqual(true);
    });

    // Load second page
    mockFindRuleTemplates.mockResolvedValueOnce({
      data: MOCK_TEMPLATES.slice(0, 1),
      page: 2,
      perPage: 5,
      total: 11,
    });

    result.current.fetchNextPage();

    rerender();
    await waitFor(() => {
      expect(result.current.hasNextPage).toEqual(true);
    });

    // Load third (last) page with only 1 item
    mockFindRuleTemplates.mockResolvedValueOnce({
      data: [MOCK_TEMPLATES[0]],
      page: 3,
      perPage: 5,
      total: 11,
    });

    result.current.fetchNextPage();

    rerender();
    await waitFor(() => {
      // page 3 * perPage 5 = 15 loaded >= 11 total, so no more pages
      expect(result.current.hasNextPage).toEqual(false);
    });
  });

  it('should use defaultSearchOperator parameter', async () => {
    const { rerender } = renderHook(
      () =>
        useFindTemplatesQuery({
          http,
          toasts: notifications.toasts,
          enabled: true,
          perPage: 10,
          search: 'template availability',
          defaultSearchOperator: 'AND',
        }),
      {
        wrapper: Wrapper,
      }
    );

    rerender();
    await waitFor(() => {
      expect(mockFindRuleTemplates).toHaveBeenLastCalledWith(
        expect.objectContaining({
          search: 'template availability',
          defaultSearchOperator: 'AND',
        })
      );
    });
  });
});
