/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useDeleteRule } from './use_delete_rule';
import { createMockServices, createTestWrapper } from '../test_utils';

describe('useDeleteRule', () => {
  const services = createMockServices();

  beforeEach(() => jest.clearAllMocks());

  it('should delete a rule and show a success toast', async () => {
    (services.http.delete as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteRule(services), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate('rule-1');

    await waitFor(() => {
      expect(services.http.delete).toHaveBeenCalledWith('/internal/alerting/v2/rule/rule-1');
      expect(services.notifications.toasts.addSuccess).toHaveBeenCalledWith(expect.any(String));
      expect(services.notifications.toasts.addDanger).not.toHaveBeenCalled();
    });
  });

  it('should show a danger toast when deletion fails', async () => {
    (services.http.delete as jest.Mock).mockRejectedValue(new Error('delete failed'));

    const { result } = renderHook(() => useDeleteRule(services), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate('rule-1');

    await waitFor(() => {
      expect(services.notifications.toasts.addDanger).toHaveBeenCalledWith(expect.any(String));
      expect(services.notifications.toasts.addSuccess).not.toHaveBeenCalled();
    });
  });

  it('should invoke per-call onSuccess callback after deletion', async () => {
    (services.http.delete as jest.Mock).mockResolvedValue(undefined);
    const onSuccess = jest.fn();

    const { result } = renderHook(() => useDeleteRule(services), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate('rule-1', { onSuccess });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(services.notifications.toasts.addSuccess).toHaveBeenCalled();
    });
  });

  it('should not invoke per-call onSuccess when deletion fails', async () => {
    (services.http.delete as jest.Mock).mockRejectedValue(new Error('delete failed'));
    const onSuccess = jest.fn();

    const { result } = renderHook(() => useDeleteRule(services), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate('rule-1', { onSuccess });

    await waitFor(() => {
      expect(onSuccess).not.toHaveBeenCalled();
      expect(services.notifications.toasts.addDanger).toHaveBeenCalled();
    });
  });
});
