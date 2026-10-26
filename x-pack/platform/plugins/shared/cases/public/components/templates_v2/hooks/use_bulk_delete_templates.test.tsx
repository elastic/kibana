/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';

import { TestProviders, createTestQueryClient } from '../../../common/mock';
import { useBulkDeleteTemplates } from './use_bulk_delete_templates';
import * as api from '../api/api';

jest.mock('../api/api');

const apiMock = api as jest.Mocked<typeof api>;

describe('useBulkDeleteTemplates', () => {
  const mockBulkDeleteResponse = {
    success: true,
    deleted: ['template-1', 'template-2'],
    errors: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    apiMock.bulkDeleteTemplates.mockResolvedValue(mockBulkDeleteResponse);
  });

  it('calls bulkDeleteTemplates when mutate is called', async () => {
    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useBulkDeleteTemplates(), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders queryClient={queryClient}>{children}</TestProviders>
      ),
    });

    await act(async () => {
      result.current.mutate({ templateIds: ['template-1', 'template-2'] });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiMock.bulkDeleteTemplates).toHaveBeenCalledWith({
      templateIds: ['template-1', 'template-2'],
    });
  });

  it('returns success response on successful bulk deletion', async () => {
    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useBulkDeleteTemplates(), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders queryClient={queryClient}>{children}</TestProviders>
      ),
    });

    await act(async () => {
      result.current.mutate({ templateIds: ['template-1', 'template-2'] });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockBulkDeleteResponse);
  });

  it('handles error correctly', async () => {
    const error = new Error('Failed to delete templates');
    apiMock.bulkDeleteTemplates.mockRejectedValue(error);

    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useBulkDeleteTemplates(), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders queryClient={queryClient}>{children}</TestProviders>
      ),
    });

    await act(async () => {
      result.current.mutate({ templateIds: ['template-1', 'template-2'] });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });

  it('calls onSuccess callback on successful bulk deletion', async () => {
    const onSuccessMock = jest.fn();
    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useBulkDeleteTemplates({ onSuccess: onSuccessMock }), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders queryClient={queryClient}>{children}</TestProviders>
      ),
    });

    await act(async () => {
      result.current.mutate({ templateIds: ['template-1', 'template-2'] });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(onSuccessMock).toHaveBeenCalled();
  });

  it('returns partial success when some templates fail to delete', async () => {
    const partialSuccessResponse = {
      success: false,
      deleted: ['template-1'],
      errors: [{ id: 'template-2', error: 'Template not found' }],
    };
    apiMock.bulkDeleteTemplates.mockResolvedValue(partialSuccessResponse);

    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useBulkDeleteTemplates(), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders queryClient={queryClient}>{children}</TestProviders>
      ),
    });

    await act(async () => {
      result.current.mutate({ templateIds: ['template-1', 'template-2'] });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(partialSuccessResponse);
    expect(result.current.data?.deleted).toHaveLength(1);
    expect(result.current.data?.errors).toHaveLength(1);
  });
});
