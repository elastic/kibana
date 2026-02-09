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
import { useCreateTemplate } from './use_create_template';
import * as api from '../api/api';
import type { TemplateRequest } from '../types';

jest.mock('../api/api');

const apiMock = api as jest.Mocked<typeof api>;

describe('useCreateTemplate', () => {
  const mockTemplateRequest: TemplateRequest = {
    name: 'New Template',
    owner: 'securitySolution',
    definition: 'fields:\n  - name: test_field\n    type: keyword',
    description: 'New Description',
    fieldCount: 5,
    tags: ['tag1'],
    author: 'user1',
    isDefault: false,
    usageCount: 0,
    lastUsedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockTemplateResponse: Template = {
    ...mockTemplateRequest,
    templateId: 'template-new',
    templateVersion: 1,
    deletedAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    apiMock.postTemplate.mockResolvedValue(mockTemplateResponse);
  });

  it('calls postTemplate when mutate is called', async () => {
    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useCreateTemplate(), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders queryClient={queryClient}>{children}</TestProviders>
      ),
    });

    await act(async () => {
      result.current.mutate({ template: mockTemplateRequest });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiMock.postTemplate).toHaveBeenCalledWith({ template: mockTemplateRequest });
  });

  it('returns the created template on success', async () => {
    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useCreateTemplate(), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders queryClient={queryClient}>{children}</TestProviders>
      ),
    });

    await act(async () => {
      result.current.mutate({ template: mockTemplateRequest });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockTemplateResponse);
  });

  it('handles error correctly', async () => {
    const error = new Error('Failed to create template');
    apiMock.postTemplate.mockRejectedValue(error);

    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useCreateTemplate(), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders queryClient={queryClient}>{children}</TestProviders>
      ),
    });

    await act(async () => {
      result.current.mutate({ template: mockTemplateRequest });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });

  it('calls onSuccess callback with template data on successful creation', async () => {
    const onSuccessMock = jest.fn();
    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useCreateTemplate({ onSuccess: onSuccessMock }), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders queryClient={queryClient}>{children}</TestProviders>
      ),
    });

    await act(async () => {
      result.current.mutate({ template: mockTemplateRequest });
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
      () => useCreateTemplate({ onSuccess: onSuccessMock, disableDefaultSuccessToast: true }),
      {
        wrapper: ({ children }: React.PropsWithChildren<{}>) => (
          <TestProviders queryClient={queryClient}>{children}</TestProviders>
        ),
      }
    );

    await act(async () => {
      result.current.mutate({ template: mockTemplateRequest });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // onSuccess callback should still be called
    expect(onSuccessMock).toHaveBeenCalledWith(mockTemplateResponse);
  });
});
