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
import { useRecoveryQueryGroupingValidation } from './use_recovery_query_grouping_validation';
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

describe('useRecoveryQueryGroupingValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns no validation error when there are no grouping fields', () => {
    const search = createMockSearch();

    const { result } = renderHook(
      () =>
        useRecoveryQueryGroupingValidation({
          control: undefined as any,
          search,
          query: 'FROM logs-* | STATS count = COUNT(*)',
        }),
      {
        wrapper: createFormAndQueryWrapper({
          grouping: undefined,
        }),
      }
    );

    expect(result.current.validationError).toBeUndefined();
    expect(result.current.missingColumns).toEqual([]);
  });

  it('returns no validation error when query is empty', () => {
    const search = createMockSearch();

    const { result } = renderHook(
      () =>
        useRecoveryQueryGroupingValidation({
          control: undefined as any,
          search,
          query: '',
        }),
      {
        wrapper: createFormAndQueryWrapper({
          grouping: { fields: ['host.name'] },
        }),
      }
    );

    expect(result.current.validationError).toBeUndefined();
  });

  it('returns no validation error when all grouping fields are present', async () => {
    const mockColumns = [
      { name: 'host.name', type: 'keyword' },
      { name: 'count', type: 'long' },
    ];
    mockGetESQLQueryColumnsRaw.mockResolvedValue(mockColumns);
    const search = createMockSearch();

    const { result } = renderHook(
      () =>
        useRecoveryQueryGroupingValidation({
          control: undefined as any,
          search,
          query: 'FROM logs-* | STATS count = COUNT(*) BY host.name',
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

  it('returns recovery-specific error message when grouping fields are missing', async () => {
    const mockColumns = [{ name: 'count', type: 'long' }];
    mockGetESQLQueryColumnsRaw.mockResolvedValue(mockColumns);
    const search = createMockSearch();

    const { result } = renderHook(
      () =>
        useRecoveryQueryGroupingValidation({
          control: undefined as any,
          search,
          query: 'FROM logs-* | STATS count = COUNT(*)',
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
    expect(result.current.validationError).toContain('host.name');
    expect(result.current.validationError).toContain(
      'Recovery query is missing columns used for grouping'
    );
    expect(result.current.validationError).toContain(
      'must include these columns to properly identify which alerts should recover'
    );
  });

  it('lists multiple missing columns in the error message', async () => {
    const mockColumns = [{ name: 'count', type: 'long' }];
    mockGetESQLQueryColumnsRaw.mockResolvedValue(mockColumns);
    const search = createMockSearch();

    const { result } = renderHook(
      () =>
        useRecoveryQueryGroupingValidation({
          control: undefined as any,
          search,
          query: 'FROM logs-* | STATS count = COUNT(*)',
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
    expect(result.current.validationError).toContain('host.name, service.name');
  });

  it('exposes recoveryColumns as an alias for queryColumns', async () => {
    const mockColumns = [
      { name: 'host.name', type: 'keyword' },
      { name: 'count', type: 'long' },
    ];
    mockGetESQLQueryColumnsRaw.mockResolvedValue(mockColumns);
    const search = createMockSearch();

    const { result } = renderHook(
      () =>
        useRecoveryQueryGroupingValidation({
          control: undefined as any,
          search,
          query: 'FROM logs-* | STATS count = COUNT(*) BY host.name',
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

    expect(result.current.recoveryColumns).toEqual(result.current.queryColumns);
    expect(result.current.recoveryColumns).toEqual([
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
        useRecoveryQueryGroupingValidation({
          control: undefined as any,
          search,
          query: 'INVALID QUERY',
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
    expect(result.current.queryError).toEqual(testError);
  });
});
