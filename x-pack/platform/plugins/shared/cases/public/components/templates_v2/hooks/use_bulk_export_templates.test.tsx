/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';

import { TestProviders, createTestQueryClient } from '../../../common/mock';
import { useBulkExportTemplates } from './use_bulk_export_templates';
import * as api from '../api/api';

jest.mock('../api/api');

const apiMock = api as jest.Mocked<typeof api>;

describe('useBulkExportTemplates', () => {
  const mockBulkExportResponse = {
    filename: 'templates-bulk-export.yaml',
    content: '---\nkey: template-1\nname: Template 1\n---\nkey: template-2\nname: Template 2',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    apiMock.bulkExportTemplates.mockResolvedValue(mockBulkExportResponse);
  });

  it('calls bulkExportTemplates when mutate is called', async () => {
    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useBulkExportTemplates(), {
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

    expect(apiMock.bulkExportTemplates).toHaveBeenCalledWith({
      templateIds: ['template-1', 'template-2'],
    });
  });

  it('returns export response on success', async () => {
    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useBulkExportTemplates(), {
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

    expect(result.current.data).toEqual(mockBulkExportResponse);
  });

  it('handles error correctly', async () => {
    const error = new Error('Failed to export templates');
    apiMock.bulkExportTemplates.mockRejectedValue(error);

    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useBulkExportTemplates(), {
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

  it('exports single template correctly', async () => {
    const singleExportResponse = {
      filename: 'templates-bulk-export.yaml',
      content: '---\nkey: template-1\nname: Template 1',
    };
    apiMock.bulkExportTemplates.mockResolvedValue(singleExportResponse);

    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useBulkExportTemplates(), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders queryClient={queryClient}>{children}</TestProviders>
      ),
    });

    await act(async () => {
      result.current.mutate({ templateIds: ['template-1'] });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiMock.bulkExportTemplates).toHaveBeenCalledWith({
      templateIds: ['template-1'],
    });
    expect(result.current.data).toEqual(singleExportResponse);
  });

  it('exports multiple templates correctly', async () => {
    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useBulkExportTemplates(), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => (
        <TestProviders queryClient={queryClient}>{children}</TestProviders>
      ),
    });

    const templateIds = ['template-1', 'template-2', 'template-3'];

    await act(async () => {
      result.current.mutate({ templateIds });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiMock.bulkExportTemplates).toHaveBeenCalledWith({ templateIds });
  });
});
