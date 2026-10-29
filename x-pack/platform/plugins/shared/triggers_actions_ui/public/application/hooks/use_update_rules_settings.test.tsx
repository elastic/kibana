/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { waitFor, renderHook, act } from '@testing-library/react';
import { useUpdateRuleSettings } from './use_update_rules_settings';

const mockAddDanger = jest.fn();
const mockAddSuccess = jest.fn();

jest.mock('../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../common/lib/kibana');
  return {
    ...originalModule,
    useKibana: () => {
      const { services } = originalModule.useKibana();
      return {
        services: {
          ...services,
          notifications: { toasts: { addSuccess: mockAddSuccess, addDanger: mockAddDanger } },
        },
      };
    },
  };
});
jest.mock('../lib/rule_api/update_query_delay_settings', () => ({
  updateQueryDelaySettings: jest.fn(),
}));
jest.mock('../lib/rule_api/update_flapping_settings', () => ({
  updateFlappingSettings: jest.fn(),
}));

const { updateQueryDelaySettings } = jest.requireMock(
  '../lib/rule_api/update_query_delay_settings'
);
const { updateFlappingSettings } = jest.requireMock('../lib/rule_api/update_flapping_settings');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
});
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useUpdateRuleSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call onSuccess if api succeeds', async () => {
    const onClose = jest.fn();
    const { result } = renderHook(
      () =>
        useUpdateRuleSettings({
          onSave: () => {},
          onClose,
          setUpdatingRulesSettings: () => {},
        }),
      {
        wrapper,
      }
    );

    await act(async () => {
      await result.current.mutate({
        flapping: { enabled: true, lookBackWindow: 3, statusChangeThreshold: 3 },
        queryDelay: { delay: 2 },
      });
    });
    await waitFor(() =>
      expect(mockAddSuccess).toHaveBeenCalledWith('Rules settings updated successfully.')
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onClose until the api resolves', async () => {
    let resolveUpdate: () => void = () => {};
    updateFlappingSettings.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveUpdate = resolve;
      })
    );
    const onClose = jest.fn();
    const { result } = renderHook(
      () => useUpdateRuleSettings({ onClose, setUpdatingRulesSettings: () => {} }),
      { wrapper }
    );

    act(() => {
      result.current.mutate({
        flapping: { enabled: true, lookBackWindow: 3, statusChangeThreshold: 3 },
      });
    });
    await waitFor(() => expect(updateFlappingSettings).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => {
      resolveUpdate();
    });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('should call onError and keep the page open if api fails', async () => {
    updateQueryDelaySettings.mockRejectedValue('');
    updateFlappingSettings.mockRejectedValue('');

    const onClose = jest.fn();
    const { result } = renderHook(
      () =>
        useUpdateRuleSettings({
          onSave: () => {},
          onClose,
          setUpdatingRulesSettings: () => {},
        }),
      {
        wrapper,
      }
    );

    await act(async () => {
      await result.current.mutate({
        flapping: { enabled: true, lookBackWindow: 3, statusChangeThreshold: 3 },
        queryDelay: { delay: 2 },
      });
    });

    await waitFor(() =>
      expect(mockAddDanger).toHaveBeenCalledWith('Failed to update rules settings.')
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});
