/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { waitFor, renderHook, act } from '@testing-library/react';
import { useUpdateRuleSettings } from './use_update_rules_settings';

const mockAddDanger = vi.fn();
const mockAddSuccess = vi.fn();

vi.mock('../../common/lib/kibana', async () => {
  const originalModule = (await vi.importActual('../../common/lib/kibana'));
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
vi.mock('../lib/rule_api/update_query_delay_settings', () => {
      const mocked = {
      updateQueryDelaySettings: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../lib/rule_api/update_flapping_settings', () => {
      const mocked = {
      updateFlappingSettings: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const { updateQueryDelaySettings } = (await vi.importMock('../lib/rule_api/update_query_delay_settings'));
const { updateFlappingSettings } = (await vi.importMock('../lib/rule_api/update_flapping_settings'));

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
    vi.clearAllMocks();
  });

  it('should call onSuccess if api succeeds', async () => {
    const { result } = renderHook(
      () =>
        useUpdateRuleSettings({
          onSave: () => {},
          onClose: () => {},
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
  });

  it('should call onError if api fails', async () => {
    updateQueryDelaySettings.mockRejectedValue('');
    updateFlappingSettings.mockRejectedValue('');

    const { result } = renderHook(
      () =>
        useUpdateRuleSettings({
          onSave: () => {},
          onClose: () => {},
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
  });
});
