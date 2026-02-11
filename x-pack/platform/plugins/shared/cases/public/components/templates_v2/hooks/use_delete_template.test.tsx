/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';

import { TestProviders, createTestQueryClient } from '../../../common/mock';
import { useDeleteTemplate } from './use_delete_template';
import * as api from '../api/api';

jest.mock('../api/api');

const apiMock = api as jest.Mocked<typeof api>;

describe('useDeleteTemplate', () => {
  const mockDeleteResponse = { success: true };

  beforeEach(() => {
    jest.clearAllMocks();
    apiMock.deleteTemplate.mockResolvedValue(mockDeleteResponse);
  });

  it('calls deleteTemplate when mutate is called', async () => {
    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useDeleteTemplate(), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders queryClient={queryClient}>{children}</TestProviders>
      ),
    });

    await act(async () => {
      result.current.mutate({ templateId: 'template-1' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiMock.deleteTemplate).toHaveBeenCalledWith({ templateId: 'template-1' });
  });

  it('returns success response on successful deletion', async () => {
    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useDeleteTemplate(), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders queryClient={queryClient}>{children}</TestProviders>
      ),
    });

    await act(async () => {
      result.current.mutate({ templateId: 'template-1' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockDeleteResponse);
  });

  it('handles error correctly', async () => {
    const error = new Error('Failed to delete template');
    apiMock.deleteTemplate.mockRejectedValue(error);

    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useDeleteTemplate(), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders queryClient={queryClient}>{children}</TestProviders>
      ),
    });

    await act(async () => {
      result.current.mutate({ templateId: 'template-1' });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });

  it('calls onSuccess callback on successful deletion', async () => {
    const onSuccessMock = jest.fn();
    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useDeleteTemplate({ onSuccess: onSuccessMock }), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders queryClient={queryClient}>{children}</TestProviders>
      ),
    });

    await act(async () => {
      result.current.mutate({ templateId: 'template-1' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(onSuccessMock).toHaveBeenCalled();
  });
});
