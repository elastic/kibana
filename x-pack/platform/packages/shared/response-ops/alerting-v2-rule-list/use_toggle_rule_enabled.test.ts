/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useToggleRuleEnabled } from './use_toggle_rule_enabled';
import { createMockServices, createTestWrapper } from './test_helpers';

describe('useToggleRuleEnabled', () => {
  const mockServices = createMockServices();
  const mockHttp = mockServices.http as jest.Mocked<typeof mockServices.http>;
  const mockToasts = mockServices.notifications.toasts as jest.Mocked<
    typeof mockServices.notifications.toasts
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should enable a rule and show a success toast', async () => {
    (mockHttp.patch as jest.Mock).mockResolvedValue({ id: 'rule-1', enabled: true });

    const { result } = renderHook(() => useToggleRuleEnabled(), {
      wrapper: createTestWrapper(mockServices),
    });

    result.current.mutate({ id: 'rule-1', enabled: true });

    await waitFor(() => {
      expect(mockHttp.patch).toHaveBeenCalledWith('/internal/alerting/v2/rule/rule-1', {
        body: JSON.stringify({ enabled: true }),
      });
      expect(mockToasts.addSuccess).toHaveBeenCalledWith('Rule enabled');
      expect(mockToasts.addDanger).not.toHaveBeenCalled();
    });
  });

  it('should disable a rule and show a success toast', async () => {
    (mockHttp.patch as jest.Mock).mockResolvedValue({ id: 'rule-1', enabled: false });

    const { result } = renderHook(() => useToggleRuleEnabled(), {
      wrapper: createTestWrapper(mockServices),
    });

    result.current.mutate({ id: 'rule-1', enabled: false });

    await waitFor(() => {
      expect(mockHttp.patch).toHaveBeenCalledWith('/internal/alerting/v2/rule/rule-1', {
        body: JSON.stringify({ enabled: false }),
      });
      expect(mockToasts.addSuccess).toHaveBeenCalledWith('Rule disabled');
    });
  });

  it('should show a danger toast when the update fails', async () => {
    (mockHttp.patch as jest.Mock).mockRejectedValue(new Error('update failed'));

    const { result } = renderHook(() => useToggleRuleEnabled(), {
      wrapper: createTestWrapper(mockServices),
    });

    result.current.mutate({ id: 'rule-1', enabled: true });

    await waitFor(() => {
      expect(mockToasts.addDanger).toHaveBeenCalledWith(expect.any(String));
      expect(mockToasts.addSuccess).not.toHaveBeenCalled();
    });
  });
});
