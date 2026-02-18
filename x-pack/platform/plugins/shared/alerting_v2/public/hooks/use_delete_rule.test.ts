/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useDeleteRule } from './use_delete_rule';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { RulesApi } from '../services/rules_api';

jest.mock('@kbn/core-di-browser');
jest.mock('../services/rules_api');

const mockUseService = useService as jest.MockedFunction<typeof useService>;
const mockCoreStart = CoreStart as jest.MockedFunction<typeof CoreStart>;

describe('useDeleteRule', () => {
  const mockDeleteRule = jest.fn();
  const mockAddSuccess = jest.fn();
  const mockAddError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockCoreStart.mockImplementation((key: string) => key as any);

    mockUseService.mockImplementation((service: unknown) => {
      if (service === RulesApi) {
        return { deleteRule: mockDeleteRule } as any;
      }
      if (service === 'notifications') {
        return { toasts: { addSuccess: mockAddSuccess, addError: mockAddError } } as any;
      }
      return undefined as any;
    });
  });

  it('should delete a rule and show a success toast', async () => {
    mockDeleteRule.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteRule());

    await result.current.deleteRule('rule-1');

    expect(mockDeleteRule).toHaveBeenCalledWith('rule-1');
    expect(mockAddSuccess).toHaveBeenCalledWith({ title: expect.any(String) });
    expect(mockAddError).not.toHaveBeenCalled();
  });

  it('should invoke the onSuccess callback after deletion', async () => {
    mockDeleteRule.mockResolvedValue(undefined);
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useDeleteRule());

    await result.current.deleteRule('rule-1', onSuccess);

    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('should not invoke onSuccess when deletion fails', async () => {
    const error = new Error('delete failed');
    mockDeleteRule.mockRejectedValue(error);
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useDeleteRule());

    await result.current.deleteRule('rule-1', onSuccess);

    expect(onSuccess).not.toHaveBeenCalled();
    expect(mockAddError).toHaveBeenCalledWith(error, { title: expect.any(String) });
    expect(mockAddSuccess).not.toHaveBeenCalled();
  });

  it('should work without an onSuccess callback', async () => {
    mockDeleteRule.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteRule());

    await result.current.deleteRule('rule-1');

    expect(mockAddSuccess).toHaveBeenCalled();
  });
});
