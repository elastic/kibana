/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useKiLifecycleAction } from './use_ki_lifecycle_action';

const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();

jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      notifications: {
        toasts: {
          addSuccess: mockAddSuccess,
          addError: mockAddError,
        },
      },
    },
  }),
}));

describe('useKiLifecycleAction', () => {
  beforeEach(() => {
    mockAddSuccess.mockClear();
    mockAddError.mockClear();
  });

  it('closes and shows success toast after confirm', async () => {
    const mutateAsync = jest.fn((_variables, { onSuccess }) => {
      onSuccess();
      return Promise.resolve();
    });

    const { result } = renderHook(() =>
      useKiLifecycleAction({
        mutation: { mutateAsync, isLoading: false },
        successTitle: 'Done',
        successText: 'Details',
        errorTitle: 'Failed',
      })
    );

    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);

    await act(async () => {
      await result.current.confirm();
    });

    expect(mutateAsync).toHaveBeenCalled();
    expect(mockAddSuccess).toHaveBeenCalledWith({ title: 'Done', text: 'Details' });
    expect(result.current.isOpen).toBe(false);
  });
});
