/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useExistingRule } from './use_existing_rule';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { useQuery } from '@kbn/react-query';
import { RulesApi } from '../services/rules_api';

jest.mock('@kbn/core-di-browser');
jest.mock('@kbn/react-query');
jest.mock('../services/rules_api');

const mockUseService = useService as jest.MockedFunction<typeof useService>;
const mockCoreStart = CoreStart as jest.MockedFunction<typeof CoreStart>;
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

describe('useExistingRule', () => {
  const mockGetRule = jest.fn();
  const mockAddError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockCoreStart.mockImplementation((key: string) => key as any);

    mockUseService.mockImplementation((service: unknown) => {
      if (service === RulesApi) {
        return { getRule: mockGetRule } as any;
      }
      if (service === 'notifications') {
        return { toasts: { addError: mockAddError } } as any;
      }
      return undefined as any;
    });
  });

  it('should return rule data on success', () => {
    const mockRuleData = { id: 'rule-1', metadata: { name: 'Test' } };
    mockUseQuery.mockReturnValue({
      data: mockRuleData,
      isLoading: false,
      error: null,
    } as any);

    const { result } = renderHook(() => useExistingRule('rule-1'));

    expect(result.current.rule).toEqual(mockRuleData);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should return loading state while fetching', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    const { result } = renderHook(() => useExistingRule('rule-1'));

    expect(result.current.rule).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });

  it('should pass the correct queryKey and enabled flag', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: null } as any);

    renderHook(() => useExistingRule('rule-1'));

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['rule', 'rule-1'],
        enabled: true,
      })
    );
  });

  it('should disable the query when ruleId is empty', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: false, error: null } as any);

    renderHook(() => useExistingRule(''));

    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('should call getRule via the queryFn', () => {
    mockUseQuery.mockImplementation((options: any) => {
      options.queryFn?.();
      return { data: undefined, isLoading: false, error: null } as any;
    });

    renderHook(() => useExistingRule('rule-1'));

    expect(mockGetRule).toHaveBeenCalledWith('rule-1');
  });

  it('should show an error toast via onError', () => {
    const error = new Error('load failed');
    mockUseQuery.mockImplementation((options: any) => {
      options.onError?.(error);
      return { data: undefined, isLoading: false, error } as any;
    });

    renderHook(() => useExistingRule('rule-1'));

    expect(mockAddError).toHaveBeenCalledWith(error, { title: expect.any(String) });
  });
});
