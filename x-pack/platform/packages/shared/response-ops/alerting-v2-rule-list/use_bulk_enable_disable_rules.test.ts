/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useBulkEnableRules, useBulkDisableRules } from './use_bulk_enable_disable_rules';
import { createMockServices, createTestWrapper } from './test_helpers';

describe('useBulkEnableRules', () => {
  const mockServices = createMockServices();
  const mockHttp = mockServices.http as jest.Mocked<typeof mockServices.http>;
  const mockToasts = mockServices.notifications.toasts as jest.Mocked<
    typeof mockServices.notifications.toasts
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls bulkEnableRules with the provided ids', async () => {
    (mockHttp.post as jest.Mock).mockResolvedValue({ rules: [], errors: [] });

    const { result } = renderHook(() => useBulkEnableRules(), {
      wrapper: createTestWrapper(mockServices),
    });

    result.current.mutate({ ids: ['rule-1', 'rule-2'] });

    await waitFor(() => {
      expect(mockHttp.post).toHaveBeenCalledWith('/internal/alerting/v2/rule/_bulk_enable', {
        body: JSON.stringify({ ids: ['rule-1', 'rule-2'] }),
      });
    });
  });

  it('shows success toast when all rules are enabled', async () => {
    (mockHttp.post as jest.Mock).mockResolvedValue({ rules: [], errors: [] });

    const { result } = renderHook(() => useBulkEnableRules(), {
      wrapper: createTestWrapper(mockServices),
    });

    result.current.mutate({ ids: ['rule-1'] });

    await waitFor(() => {
      expect(mockToasts.addSuccess).toHaveBeenCalledWith('Rules enabled successfully');
    });
  });

  it('shows warning toast when there are partial errors', async () => {
    (mockHttp.post as jest.Mock).mockResolvedValue({
      rules: [],
      errors: [{ id: 'rule-2', error: { message: 'Conflict', statusCode: 409 } }],
    });

    const { result } = renderHook(() => useBulkEnableRules(), {
      wrapper: createTestWrapper(mockServices),
    });

    result.current.mutate({ ids: ['rule-1', 'rule-2'] });

    await waitFor(() => {
      expect(mockToasts.addWarning).toHaveBeenCalledWith(expect.stringContaining('1 error'));
      expect(mockToasts.addSuccess).not.toHaveBeenCalled();
    });
  });

  it('shows danger toast when the mutation fails', async () => {
    (mockHttp.post as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useBulkEnableRules(), {
      wrapper: createTestWrapper(mockServices),
    });

    result.current.mutate({ ids: ['rule-1'] });

    await waitFor(() => {
      expect(mockToasts.addDanger).toHaveBeenCalledWith('Failed to enable rules');
    });
  });
});

describe('useBulkDisableRules', () => {
  const mockServices = createMockServices();
  const mockHttp = mockServices.http as jest.Mocked<typeof mockServices.http>;
  const mockToasts = mockServices.notifications.toasts as jest.Mocked<
    typeof mockServices.notifications.toasts
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls bulkDisableRules with the provided ids', async () => {
    (mockHttp.post as jest.Mock).mockResolvedValue({ rules: [], errors: [] });

    const { result } = renderHook(() => useBulkDisableRules(), {
      wrapper: createTestWrapper(mockServices),
    });

    result.current.mutate({ ids: ['rule-1', 'rule-2'] });

    await waitFor(() => {
      expect(mockHttp.post).toHaveBeenCalledWith('/internal/alerting/v2/rule/_bulk_disable', {
        body: JSON.stringify({ ids: ['rule-1', 'rule-2'] }),
      });
    });
  });

  it('shows success toast when all rules are disabled', async () => {
    (mockHttp.post as jest.Mock).mockResolvedValue({ rules: [], errors: [] });

    const { result } = renderHook(() => useBulkDisableRules(), {
      wrapper: createTestWrapper(mockServices),
    });

    result.current.mutate({ ids: ['rule-1'] });

    await waitFor(() => {
      expect(mockToasts.addSuccess).toHaveBeenCalledWith('Rules disabled successfully');
    });
  });

  it('shows warning toast when there are partial errors', async () => {
    (mockHttp.post as jest.Mock).mockResolvedValue({
      rules: [],
      errors: [
        { id: 'rule-1', error: { message: 'Not found', statusCode: 404 } },
        { id: 'rule-2', error: { message: 'Conflict', statusCode: 409 } },
      ],
    });

    const { result } = renderHook(() => useBulkDisableRules(), {
      wrapper: createTestWrapper(mockServices),
    });

    result.current.mutate({ ids: ['rule-1', 'rule-2'] });

    await waitFor(() => {
      expect(mockToasts.addWarning).toHaveBeenCalledWith(expect.stringContaining('2 errors'));
      expect(mockToasts.addSuccess).not.toHaveBeenCalled();
    });
  });

  it('shows danger toast when the mutation fails', async () => {
    (mockHttp.post as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useBulkDisableRules(), {
      wrapper: createTestWrapper(mockServices),
    });

    result.current.mutate({ ids: ['rule-1'] });

    await waitFor(() => {
      expect(mockToasts.addDanger).toHaveBeenCalledWith('Failed to disable rules');
    });
  });
});
