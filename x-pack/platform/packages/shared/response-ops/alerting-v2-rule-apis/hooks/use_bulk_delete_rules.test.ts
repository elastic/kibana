/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useBulkDeleteRules } from './use_bulk_delete_rules';
import { createMockServices, createTestWrapper } from '../test_utils';

describe('useBulkDeleteRules', () => {
  const services = createMockServices();

  beforeEach(() => jest.clearAllMocks());

  it('calls bulkDeleteRules with the provided ids', async () => {
    (services.http.post as jest.Mock).mockResolvedValue({ rules: [], errors: [] });

    const { result } = renderHook(() => useBulkDeleteRules(services), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate({ ids: ['rule-1', 'rule-2'] });

    await waitFor(() => {
      expect(services.http.post).toHaveBeenCalledWith('/internal/alerting/v2/rule/_bulk_delete', {
        body: JSON.stringify({ ids: ['rule-1', 'rule-2'] }),
      });
    });
  });

  it('shows success toast when all rules are deleted', async () => {
    (services.http.post as jest.Mock).mockResolvedValue({ rules: [], errors: [] });

    const { result } = renderHook(() => useBulkDeleteRules(services), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate({ ids: ['rule-1'] });

    await waitFor(() => {
      expect(services.notifications.toasts.addSuccess).toHaveBeenCalledWith(
        'Rules deleted successfully'
      );
    });
  });

  it('shows warning toast when there are partial errors', async () => {
    (services.http.post as jest.Mock).mockResolvedValue({
      rules: [],
      errors: [{ id: 'rule-2', error: { message: 'Not found', statusCode: 404 } }],
    });

    const { result } = renderHook(() => useBulkDeleteRules(services), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate({ ids: ['rule-1', 'rule-2'] });

    await waitFor(() => {
      expect(services.notifications.toasts.addWarning).toHaveBeenCalledWith(
        expect.stringContaining('1 error')
      );
      expect(services.notifications.toasts.addSuccess).not.toHaveBeenCalled();
    });
  });

  it('shows danger toast when the mutation fails', async () => {
    (services.http.post as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useBulkDeleteRules(services), {
      wrapper: createTestWrapper(),
    });

    result.current.mutate({ ids: ['rule-1'] });

    await waitFor(() => {
      expect(services.notifications.toasts.addDanger).toHaveBeenCalledWith(
        'Failed to delete rules'
      );
    });
  });
});
