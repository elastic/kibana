/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';

import { TestProviders } from '../../../common/mock';
import { useTemplatesPagination } from './use_templates_pagination';
import type { TemplatesFindRequest } from '../../../../common/types/api/template/v1';
import { PAGE_SIZE_OPTIONS } from '../constants';

describe('useTemplatesPagination', () => {
  const wrapper = ({ children }: React.PropsWithChildren<{}>) => (
    <TestProviders>{children}</TestProviders>
  );

  const defaultQueryParams: TemplatesFindRequest = {
    page: 1,
    perPage: 10,
    sortField: 'name',
    sortOrder: 'asc',
    search: '',
    tags: [],
    author: [],
    isDeleted: false,
  };

  const setQueryParams = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns pagination configuration', () => {
    const { result } = renderHook(
      () =>
        useTemplatesPagination({
          queryParams: defaultQueryParams,
          setQueryParams,
          totalItemCount: 100,
        }),
      { wrapper }
    );

    expect(result.current.pagination).toEqual({
      pageIndex: 0,
      pageSize: 10,
      totalItemCount: 100,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
    });
  });

  it('calculates pageIndex correctly (zero-based)', () => {
    const queryParams = { ...defaultQueryParams, page: 3 };

    const { result } = renderHook(
      () =>
        useTemplatesPagination({
          queryParams,
          setQueryParams,
          totalItemCount: 100,
        }),
      { wrapper }
    );

    expect(result.current.pagination.pageIndex).toBe(2);
  });

  it('returns onTableChange callback', () => {
    const { result } = renderHook(
      () =>
        useTemplatesPagination({
          queryParams: defaultQueryParams,
          setQueryParams,
          totalItemCount: 100,
        }),
      { wrapper }
    );

    expect(typeof result.current.onTableChange).toBe('function');
  });

  it('calls setQueryParams with page info when onTableChange is called with page', () => {
    const { result } = renderHook(
      () =>
        useTemplatesPagination({
          queryParams: defaultQueryParams,
          setQueryParams,
          totalItemCount: 100,
        }),
      { wrapper }
    );

    act(() => {
      result.current.onTableChange({
        page: { index: 2, size: 25 },
      });
    });

    expect(setQueryParams).toHaveBeenCalledWith({
      page: 3,
      perPage: 25,
    });
  });

  it('calls setQueryParams with sort info when onTableChange is called with sort', () => {
    const { result } = renderHook(
      () =>
        useTemplatesPagination({
          queryParams: defaultQueryParams,
          setQueryParams,
          totalItemCount: 100,
        }),
      { wrapper }
    );

    act(() => {
      result.current.onTableChange({
        sort: { field: 'lastUsedAt', direction: 'desc' },
        page: { index: 0, size: 10 },
      });
    });

    expect(setQueryParams).toHaveBeenCalledWith({
      page: 1,
      perPage: 10,
      sortField: 'lastUsedAt',
      sortOrder: 'desc',
    });
  });

  it('calls setQueryParams with both page and sort info', () => {
    const { result } = renderHook(
      () =>
        useTemplatesPagination({
          queryParams: defaultQueryParams,
          setQueryParams,
          totalItemCount: 100,
        }),
      { wrapper }
    );

    act(() => {
      result.current.onTableChange({
        page: { index: 1, size: 50 },
        sort: { field: 'usageCount', direction: 'asc' },
      });
    });

    expect(setQueryParams).toHaveBeenCalledWith({
      page: 2,
      perPage: 50,
      sortField: 'usageCount',
      sortOrder: 'asc',
    });
  });

  it('updates pagination when totalItemCount changes', () => {
    const { result, rerender } = renderHook(
      ({ totalItemCount }) =>
        useTemplatesPagination({
          queryParams: defaultQueryParams,
          setQueryParams,
          totalItemCount,
        }),
      {
        wrapper,
        initialProps: { totalItemCount: 100 },
      }
    );

    expect(result.current.pagination.totalItemCount).toBe(100);

    rerender({ totalItemCount: 50 });

    expect(result.current.pagination.totalItemCount).toBe(50);
  });
});
