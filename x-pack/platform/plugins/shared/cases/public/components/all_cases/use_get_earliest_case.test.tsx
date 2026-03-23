/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useGetCases } from '../../containers/use_get_cases';
import { useGetEarliestCase } from './use_get_earliest_case';
import { TestProviders } from '../../common/mock';
import { SortFieldCase } from '../../../common/ui/types';
import { basicCase } from '../../containers/mock';

jest.mock('../../containers/use_get_cases');

const useGetCasesMock = useGetCases as jest.Mock;
const queryParams = {
  page: 1,
  perPage: 1,
  sortField: SortFieldCase.createdAt,
  sortOrder: 'asc',
};

describe('useGetEarliestCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call useGetCases with correct parameters', () => {
    const filterOptions = {
      owner: ['securitySolution'],
      from: '2020-01-01',
      to: '2020-12-31',
    };

    renderHook(() => useGetEarliestCase(filterOptions), {
      wrapper: TestProviders,
    });

    expect(useGetCasesMock).toHaveBeenCalledWith({
      filterOptions: {
        owner: ['securitySolution'],
        from: undefined,
        to: undefined,
      },
      queryParams,
    });
  });

  it('should return the first case when cases exist', () => {
    const filterOptions = {
      owner: ['securitySolution'],
    };

    useGetCasesMock.mockReturnValue({
      data: {
        cases: [basicCase],
        total: 1,
      },
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() => useGetEarliestCase(filterOptions), {
      wrapper: TestProviders,
    });

    expect(result.current.earliestCase).toEqual(basicCase);
    expect(result.current.isLoading).toEqual(false);
  });

  it('should return undefined when no cases exist', () => {
    useGetCasesMock.mockReturnValue({
      data: {
        cases: [],
        total: 0,
      },
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() => useGetEarliestCase({}), {
      wrapper: TestProviders,
    });

    expect(result.current.earliestCase).toBeUndefined();
    expect(result.current.isLoading).toEqual(false);
  });

  it('should return undefined when data is undefined', () => {
    useGetCasesMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() => useGetEarliestCase({}), {
      wrapper: TestProviders,
    });

    expect(result.current.earliestCase).toBeUndefined();
  });

  it('should ignore from and to in filterOptions and set them to undefined', () => {
    const filterOptions = {
      from: '2020-01-01T00:00:00Z',
      to: '2020-12-31T23:59:59Z',
    };

    renderHook(() => useGetEarliestCase(filterOptions), {
      wrapper: TestProviders,
    });

    expect(useGetCasesMock).toHaveBeenCalledWith({
      filterOptions: {
        from: undefined,
        to: undefined,
      },
      queryParams,
    });
  });

  it('should ignore other filterOptions and pass the owner from filterOptions correctly', () => {
    const filterOptions = {
      owner: ['observability'],
      tags: ['tag1', 'tag2'],
      category: ['category1', 'category2'],
      assignees: ['assignee1', 'assignee2'],
    };

    renderHook(() => useGetEarliestCase(filterOptions), {
      wrapper: TestProviders,
    });

    expect(useGetCasesMock).toHaveBeenCalledWith({
      filterOptions: {
        owner: ['observability'],
        from: undefined,
        to: undefined,
      },
      queryParams,
    });
  });
});
