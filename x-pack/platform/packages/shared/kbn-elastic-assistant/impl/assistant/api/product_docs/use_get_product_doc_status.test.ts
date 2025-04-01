/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';
import { useGetProductDocStatus } from './use_get_product_doc_status';
import { useAssistantContext } from '../../../..';
import { TestProviders } from '../../../mock/test_providers/test_providers';

jest.mock('../../../..', () => ({
  useAssistantContext: jest.fn(),
}));

describe('useGetProductDocStatus', () => {
  const mockGetStatus = jest.fn();

  beforeEach(() => {
    (useAssistantContext as jest.Mock).mockReturnValue({
      productDocBase: {
        installation: {
          getStatus: mockGetStatus,
        },
      },
    });
  });

  it('returns loading state initially', async () => {
    mockGetStatus.mockResolvedValueOnce('status');
    const { result } = renderHook(() => useGetProductDocStatus(), {
      wrapper: TestProviders,
    });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => result.current.isSuccess);
  });

  it('returns success state with data', async () => {
    mockGetStatus.mockResolvedValueOnce('status');
    const { result } = renderHook(() => useGetProductDocStatus(), {
      wrapper: TestProviders,
    });

    await waitFor(() => {
      expect(result.current.status).toBe('status');
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('returns error state when query fails', async () => {
    mockGetStatus.mockRejectedValueOnce(new Error('error'));
    const { result } = renderHook(() => useGetProductDocStatus(), {
      wrapper: TestProviders,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
