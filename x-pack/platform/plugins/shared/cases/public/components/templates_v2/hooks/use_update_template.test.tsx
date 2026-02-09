/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { Template } from '../../../../common/types/domain/template/v1';
import { TestProviders, createTestQueryClient } from '../../../common/mock';
import { useUpdateTemplate } from './use_update_template';
import * as api from '../api/api';
import type { TemplateUpdateRequest } from '../types';

jest.mock('../api/api');

const apiMock = api as jest.Mocked<typeof api>;

describe('useUpdateTemplate', () => {
  const mockUpdateRequest: TemplateUpdateRequest = {
    name: 'Updated Template',
    description: 'Updated Description',
  };

  const mockTemplateResponse: Template = {
    templateId: 'template-1',
    name: 'Updated Template',
    owner: 'securitySolution',
    definition: 'fields:\n  - name: field1\n    type: keyword',
    templateVersion: 1,
    deletedAt: null,
    description: 'Updated Description',
    fieldCount: 5,
    tags: ['tag1'],
    author: 'user1',
    lastUsedAt: '2024-01-01T00:00:00.000Z',
    usageCount: 10,
    isDefault: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    apiMock.patchTemplate.mockResolvedValue(mockTemplateResponse);
  });

  it('calls patchTemplate when mutate is called', async () => {
    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useUpdateTemplate(), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders queryClient={queryClient}>{children}</TestProviders>
      ),
    });

    await act(async () => {
      result.current.mutate({ templateId: 'template-1', template: mockUpdateRequest });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiMock.patchTemplate).toHaveBeenCalledWith({
      templateId: 'template-1',
      template: mockUpdateRequest,
    });
  });

  it('returns the updated template on success', async () => {
    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useUpdateTemplate(), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders queryClient={queryClient}>{children}</TestProviders>
      ),
    });

    await act(async () => {
      result.current.mutate({ templateId: 'template-1', template: mockUpdateRequest });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockTemplateResponse);
  });

  it('handles error correctly', async () => {
    const error = new Error('Failed to update template');
    apiMock.patchTemplate.mockRejectedValue(error);

    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useUpdateTemplate(), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders queryClient={queryClient}>{children}</TestProviders>
      ),
    });

    await act(async () => {
      result.current.mutate({ templateId: 'template-1', template: mockUpdateRequest });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });

  it('calls onSuccess callback with template data on successful update', async () => {
    const onSuccessMock = jest.fn();
    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useUpdateTemplate({ onSuccess: onSuccessMock }), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders queryClient={queryClient}>{children}</TestProviders>
      ),
    });

    await act(async () => {
      result.current.mutate({ templateId: 'template-1', template: mockUpdateRequest });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(onSuccessMock).toHaveBeenCalledWith(mockTemplateResponse);
  });

  it('does not show default success toast when disableDefaultSuccessToast is true', async () => {
    const onSuccessMock = jest.fn();
    const queryClient = createTestQueryClient();

    const { result } = renderHook(
      () => useUpdateTemplate({ onSuccess: onSuccessMock, disableDefaultSuccessToast: true }),
      {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders queryClient={queryClient}>{children}</TestProviders>
        ),
      }
    );

    await act(async () => {
      result.current.mutate({ templateId: 'template-1', template: mockUpdateRequest });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // onSuccess callback should still be called
    expect(onSuccessMock).toHaveBeenCalledWith(mockTemplateResponse);
  });
});
