/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { getESQLQueryColumnsRaw } from '@kbn/esql-utils';
import { createQueryClientWrapper, defaultTestFormValues } from '../../test_utils';
import { useQueryGroupingValidation } from './use_query_grouping_validation';
import type { FormValues } from '../types';

jest.mock('@kbn/esql-utils');

const mockGetESQLQueryColumnsRaw = jest.mocked(getESQLQueryColumnsRaw);
const createMockSearch = () => dataPluginMock.createStartContract().search.search;

const createFormAndQueryWrapper = (defaultValues: Partial<FormValues> = {}) => {
  const queryClientWrapper = createQueryClientWrapper();

  return ({ children }: { children: React.ReactNode }) => {
    const form = useForm<FormValues>({
      defaultValues: { ...defaultTestFormValues, ...defaultValues },
    });
    const QueryWrapper = queryClientWrapper;

    return (
      <QueryWrapper>
        <FormProvider {...form}>{children}</FormProvider>
      </QueryWrapper>
    );
  };
};

describe('useQueryGroupingValidation', () => {
  const getErrorMessage = (missingColumns: string[]) =>
    `Query is missing grouping columns: ${missingColumns.join(', ')}`;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns no validation error when there are no grouping fields', async () => {
    const search = createMockSearch();

    const { result } = renderHook(
      () =>
        useQueryGroupingValidation({
          control: undefined as any, // will be provided by form context
          search,
          query: 'FROM logs-* | STATS count = COUNT(*)',
          getErrorMessage,
        }),
      {
        wrapper: createFormAndQueryWrapper({
          grouping: undefined,
        }),
      }
    );

    // No grouping fields → no validation error
    expect(result.current.validationError).toBeUndefined();
    expect(result.current.missingColumns).toEqual([]);
  });

  it('returns no validation error when query is empty', () => {
    const search = createMockSearch();

    const { result } = renderHook(
      () =>
        useQueryGroupingValidation({
          control: undefined as any,
          search,
          query: '',
          getErrorMessage,
        }),
      {
        wrapper: createFormAndQueryWrapper({
          grouping: { fields: ['host.name'] },
        }),
      }
    );

    expect(result.current.validationError).toBeUndefined();
    expect(result.current.missingColumns).toEqual([]);
  });

  it('returns no validation error when all grouping fields are present in query columns', async () => {
    const mockColumns = [
      { name: 'host.name', type: 'keyword' },
      { name: 'count', type: 'long' },
    ];
    mockGetESQLQueryColumnsRaw.mockResolvedValue(mockColumns);
    const search = createMockSearch();

    const { result } = renderHook(
      () =>
        useQueryGroupingValidation({
          control: undefined as any,
          search,
          query: 'FROM logs-* | STATS count = COUNT(*) BY host.name',
          getErrorMessage,
        }),
      {
        wrapper: createFormAndQueryWrapper({
          grouping: { fields: ['host.name'] },
        }),
      }
    );

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(result.current.validationError).toBeUndefined();
    expect(result.current.missingColumns).toEqual([]);
  });

  it('returns validation error when grouping fields are missing from query columns', async () => {
    const mockColumns = [{ name: 'count', type: 'long' }];
    mockGetESQLQueryColumnsRaw.mockResolvedValue(mockColumns);
    const search = createMockSearch();

    const { result } = renderHook(
      () =>
        useQueryGroupingValidation({
          control: undefined as any,
          search,
          query: 'FROM logs-* | STATS count = COUNT(*)',
          getErrorMessage,
        }),
      {
        wrapper: createFormAndQueryWrapper({
          grouping: { fields: ['host.name'] },
        }),
      }
    );

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(result.current.missingColumns).toEqual(['host.name']);
    expect(result.current.validationError).toBe('Query is missing grouping columns: host.name');
  });

  it('returns multiple missing columns in the error message', async () => {
    const mockColumns = [{ name: 'count', type: 'long' }];
    mockGetESQLQueryColumnsRaw.mockResolvedValue(mockColumns);
    const search = createMockSearch();

    const { result } = renderHook(
      () =>
        useQueryGroupingValidation({
          control: undefined as any,
          search,
          query: 'FROM logs-* | STATS count = COUNT(*)',
          getErrorMessage,
        }),
      {
        wrapper: createFormAndQueryWrapper({
          grouping: { fields: ['host.name', 'service.name'] },
        }),
      }
    );

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(result.current.missingColumns).toEqual(['host.name', 'service.name']);
    expect(result.current.validationError).toBe(
      'Query is missing grouping columns: host.name, service.name'
    );
  });

  it('returns partial missing columns when only some are present', async () => {
    const mockColumns = [
      { name: 'host.name', type: 'keyword' },
      { name: 'count', type: 'long' },
    ];
    mockGetESQLQueryColumnsRaw.mockResolvedValue(mockColumns);
    const search = createMockSearch();

    const { result } = renderHook(
      () =>
        useQueryGroupingValidation({
          control: undefined as any,
          search,
          query: 'FROM logs-* | STATS count = COUNT(*) BY host.name',
          getErrorMessage,
        }),
      {
        wrapper: createFormAndQueryWrapper({
          grouping: { fields: ['host.name', 'service.name'] },
        }),
      }
    );

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(result.current.missingColumns).toEqual(['service.name']);
    expect(result.current.validationError).toBe('Query is missing grouping columns: service.name');
  });

  it('returns isValidating true while columns are loading', () => {
    // Don't resolve the mock - keep it loading
    mockGetESQLQueryColumnsRaw.mockReturnValue(new Promise(() => {}));
    const search = createMockSearch();

    const { result } = renderHook(
      () =>
        useQueryGroupingValidation({
          control: undefined as any,
          search,
          query: 'FROM logs-* | STATS count = COUNT(*)',
          getErrorMessage,
        }),
      {
        wrapper: createFormAndQueryWrapper({
          grouping: { fields: ['host.name'] },
        }),
      }
    );

    expect(result.current.isValidating).toBe(true);
    expect(result.current.validationError).toBeUndefined();
  });

  it('returns query columns for consumer use', async () => {
    const mockColumns = [
      { name: 'host.name', type: 'keyword' },
      { name: 'count', type: 'long' },
    ];
    mockGetESQLQueryColumnsRaw.mockResolvedValue(mockColumns);
    const search = createMockSearch();

    const { result } = renderHook(
      () =>
        useQueryGroupingValidation({
          control: undefined as any,
          search,
          query: 'FROM logs-* | STATS count = COUNT(*) BY host.name',
          getErrorMessage,
        }),
      {
        wrapper: createFormAndQueryWrapper({
          grouping: { fields: ['host.name'] },
        }),
      }
    );

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(result.current.queryColumns).toEqual([
      { name: 'host.name', type: 'keyword' },
      { name: 'count', type: 'long' },
    ]);
  });

  it('handles query fetch errors gracefully', async () => {
    const testError = new Error('Query parsing failed');
    mockGetESQLQueryColumnsRaw.mockRejectedValue(testError);
    const search = createMockSearch();

    const { result } = renderHook(
      () =>
        useQueryGroupingValidation({
          control: undefined as any,
          search,
          query: 'INVALID QUERY',
          getErrorMessage,
        }),
      {
        wrapper: createFormAndQueryWrapper({
          grouping: { fields: ['host.name'] },
        }),
      }
    );

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    // Should not produce a validation error when column fetch fails
    expect(result.current.validationError).toBeUndefined();
    expect(result.current.queryError).toEqual(testError);
  });
});
