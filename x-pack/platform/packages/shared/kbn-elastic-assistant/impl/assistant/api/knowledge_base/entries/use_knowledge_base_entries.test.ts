/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useKnowledgeBaseEntries } from './use_knowledge_base_entries';
import type { HttpSetup } from '@kbn/core/public';
import type { IToasts } from '@kbn/core-notifications-browser';
import { TestProviders } from '../../../../mock/test_providers/test_providers';

describe('useKnowledgeBaseEntries', () => {
  const httpMock: HttpSetup = {
    fetch: jest.fn(),
  } as unknown as HttpSetup;
  const toastsMock: IToasts = {
    addError: jest.fn(),
  } as unknown as IToasts;

  it('fetches knowledge base entries successfully', async () => {
    (httpMock.fetch as jest.Mock).mockResolvedValue({
      page: 1,
      perPage: 100,
      total: 1,
      data: [{ id: '1', title: 'Entry 1' }],
    });

    const { result } = renderHook(
      () => useKnowledgeBaseEntries({ http: httpMock, enabled: true }),
      {
        wrapper: TestProviders,
      }
    );
    expect(result.current.fetchStatus).toEqual('fetching');

    await waitFor(() =>
      expect(result.current.data).toEqual({
        page: 1,
        perPage: 100,
        total: 1,
        data: [{ id: '1', title: 'Entry 1' }],
      })
    );
  });

  it('handles fetch error', async () => {
    const error = new Error('Fetch error');
    (httpMock.fetch as jest.Mock).mockRejectedValue(error);

    renderHook(
      () => useKnowledgeBaseEntries({ http: httpMock, toasts: toastsMock, enabled: true }),
      {
        wrapper: TestProviders,
      }
    );

    await waitFor(() =>
      expect(toastsMock.addError).toHaveBeenCalledWith(error, {
        title: 'Error fetching Knowledge Base entries',
      })
    );
  });

  it('does not fetch when disabled', async () => {
    const { result } = renderHook(
      () => useKnowledgeBaseEntries({ http: httpMock, enabled: false }),
      {
        wrapper: TestProviders,
      }
    );

    expect(result.current.fetchStatus).toEqual('idle');
  });
});
