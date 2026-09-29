/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { act, renderHook } from '@testing-library/react';

import {
  sendPostBulkAgentTagsUpdate,
  sendPutAgentTagsUpdate,
  useStartServices,
} from '../../../../hooks';

import { useUpdateTags } from './use_update_tags';

vi.mock('../../../../hooks', () => {
      const mocked = {
      sendPutAgentTagsUpdate: vi.fn(),
      sendPostBulkAgentTagsUpdate: vi.fn(),
      useStartServices: vi.fn().mockReturnValue({
        notifications: {
          toasts: {
            addSuccess: vi.fn(),
            addError: vi.fn(),
          },
        },
      }),
    };
      return { ...mocked, default: mocked };
    });

const mockSendPutAgentTagsUpdate = sendPutAgentTagsUpdate as Mock;
const mockSendPostBulkAgentTagsUpdate = sendPostBulkAgentTagsUpdate as Mock;

describe('useUpdateTags', () => {
  const mockOnSuccess = vi.fn();
  beforeEach(() => {
    mockSendPutAgentTagsUpdate.mockReset();
    mockSendPostBulkAgentTagsUpdate.mockReset();
    mockOnSuccess.mockReset();
  });
  it('should call onSuccess when update tags succeeds', async () => {
    mockSendPutAgentTagsUpdate.mockResolvedValueOnce({ data: {} });

    const { result } = renderHook(() => useUpdateTags());
    await act(() => result.current.updateTags('agent1', ['tag1'], mockOnSuccess));
    expect(mockOnSuccess).toHaveBeenCalled();
    expect(useStartServices().notifications.toasts.addSuccess as Mock).toHaveBeenCalledWith(
      'Tag(s) updated'
    );
  });

  it('should call show error toast when update tags fails', async () => {
    mockSendPutAgentTagsUpdate.mockResolvedValueOnce({ error: 'error' });

    const { result } = renderHook(() => useUpdateTags());
    await act(() => result.current.updateTags('agent1', ['tag1'], mockOnSuccess));
    expect(mockOnSuccess).not.toHaveBeenCalled();
    expect(useStartServices().notifications.toasts.addError as Mock).toHaveBeenCalledWith(
      'error',
      { title: 'Tag(s) update failed' }
    );
  });

  it('should call onSuccess when bulk update tags succeeds', async () => {
    mockSendPostBulkAgentTagsUpdate.mockResolvedValueOnce({ data: { actionId: 'action' } });

    const { result } = renderHook(() => useUpdateTags());
    await act(() => result.current.bulkUpdateTags('query', ['tag1'], [], mockOnSuccess));
    expect(mockOnSuccess).toHaveBeenCalled();
    expect(useStartServices().notifications.toasts.addSuccess as Mock).toHaveBeenCalledWith(
      'Tag(s) updated'
    );
  });

  it('should call show error toast when bulk update tags fails', async () => {
    mockSendPostBulkAgentTagsUpdate.mockRejectedValueOnce({ error: 'error' });

    const { result } = renderHook(() => useUpdateTags());
    await act(() => result.current.bulkUpdateTags('query', ['tag1'], [], mockOnSuccess));
    expect(mockOnSuccess).not.toHaveBeenCalled();
    expect(useStartServices().notifications.toasts.addError as Mock).toHaveBeenCalledWith(
      'error',
      { title: 'Tag(s) update failed' }
    );
  });
});
