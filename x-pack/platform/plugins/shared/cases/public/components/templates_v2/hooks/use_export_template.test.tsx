/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';

import { TestProviders, createTestQueryClient } from '../../../common/mock';
import { useExportTemplate } from './use_export_template';
import * as api from '../api/api';

jest.mock('../api/api');

const apiMock = api as jest.Mocked<typeof api>;

describe('useExportTemplate', () => {
  const mockExportResponse = {
    filename: 'template-export.yaml',
    content: 'key: template-1\nname: Template 1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    apiMock.exportTemplate.mockResolvedValue(mockExportResponse);
  });

  it('calls exportTemplate when mutate is called', async () => {
    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useExportTemplate(), {
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

    expect(apiMock.exportTemplate).toHaveBeenCalledWith({ templateId: 'template-1' });
  });

  it('returns export response on success', async () => {
    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useExportTemplate(), {
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

    expect(result.current.data).toEqual(mockExportResponse);
  });

  it('handles error correctly', async () => {
    const error = new Error('Failed to export template');
    apiMock.exportTemplate.mockRejectedValue(error);

    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useExportTemplate(), {
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
});
