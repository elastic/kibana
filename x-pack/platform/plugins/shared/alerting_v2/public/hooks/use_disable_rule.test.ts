/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useDisableRule } from './use_disable_rule';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { useQueryClient } from '@kbn/react-query';
import { RulesApi } from '../services/rules_api';

jest.mock('@kbn/core-di-browser');
jest.mock('@kbn/react-query');
jest.mock('../services/rules_api');

const mockUseService = useService as jest.MockedFunction<typeof useService>;
const mockCoreStart = CoreStart as jest.MockedFunction<typeof CoreStart>;
const mockUseQueryClient = useQueryClient as jest.MockedFunction<typeof useQueryClient>;

describe('useDisableRule', () => {
  const mockDisableRule = jest.fn();
  const mockAddSuccess = jest.fn();
  const mockAddError = jest.fn();
  const mockInvalidateQueries = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockCoreStart.mockImplementation((key: string) => key as any);

    mockUseService.mockImplementation((service: unknown) => {
      if (service === RulesApi) {
        return { disableRule: mockDisableRule } as any;
      }
      if (service === 'notifications') {
        return { toasts: { addSuccess: mockAddSuccess, addError: mockAddError } } as any;
      }
      return undefined as any;
    });

    mockUseQueryClient.mockReturnValue({ invalidateQueries: mockInvalidateQueries } as any);
  });

  it('should disable a rule, show a success toast, and invalidate the query cache', async () => {
    mockDisableRule.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDisableRule());

    await result.current.disableRule('rule-1');

    expect(mockDisableRule).toHaveBeenCalledWith('rule-1');
    expect(mockAddSuccess).toHaveBeenCalledWith({ title: expect.any(String) });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['rule', 'rule-1'],
      exact: false,
    });
  });

  it('should show an error toast and not invalidate queries when disabling fails', async () => {
    const error = new Error('disable failed');
    mockDisableRule.mockRejectedValue(error);
    const { result } = renderHook(() => useDisableRule());

    await result.current.disableRule('rule-1');

    expect(mockAddError).toHaveBeenCalledWith(error, { title: expect.any(String) });
    expect(mockAddSuccess).not.toHaveBeenCalled();
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });

  it('should pass the correct rule id through to the API and query key', async () => {
    mockDisableRule.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDisableRule());

    await result.current.disableRule('custom-id-123');

    expect(mockDisableRule).toHaveBeenCalledWith('custom-id-123');
    expect(mockInvalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['rule', 'custom-id-123'] })
    );
  });
});
