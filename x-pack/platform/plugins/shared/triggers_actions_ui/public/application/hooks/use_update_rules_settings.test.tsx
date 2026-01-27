/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { waitFor, renderHook, act } from '@testing-library/react';
import { useUpdateRuleSettings } from './use_update_rules_settings';
import { createTestResponseOpsQueryClient } from '@kbn/response-ops-react-query/test_utils/create_test_response_ops_query_client';

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

const { provider: wrapper } = createTestResponseOpsQueryClient();

describe('useUpdateRuleSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    act(() => {
      result.current.mutate({
        flapping: { enabled: true, lookBackWindow: 3, statusChangeThreshold: 3 },
        queryDelay: { delay: 2 },
      });
    });
    await waitFor(() =>
      expect(mockAddSuccess).toBeCalledWith('Rules settings updated successfully.')
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

    await waitFor(() => expect(mockAddDanger).toBeCalledWith('Failed to update rules settings.'));
  });
});
