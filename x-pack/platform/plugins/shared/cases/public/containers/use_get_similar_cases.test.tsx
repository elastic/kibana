/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook, waitFor } from '@testing-library/react';
import * as api from './api';
import { useToasts } from '../common/lib/kibana/hooks';
import { useGetSimilarCases } from './use_get_similar_cases';
import { mockCase } from './mock';
import { TestProviders } from '../common/mock';

vi.mock('./api');
vi.mock('../common/lib/kibana/hooks');

describe('useGetSimilarCases', () => {
  const abortCtrl = new AbortController();
  const addSuccess = vi.fn();
  (useToasts as Mock).mockReturnValue({ addSuccess, addError: vi.fn() });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls getSimilarCases with correct arguments', async () => {
    const spyOnGetCases = vi.spyOn(api, 'getSimilarCases');
    renderHook(
      () => useGetSimilarCases({ caseId: mockCase.id, perPage: 10, page: 0, enabled: true }),
      {
        wrapper: TestProviders,
      }
    );

    await waitFor(() => {
      expect(spyOnGetCases).toHaveBeenCalled();
    });

    expect(spyOnGetCases).toHaveBeenCalledWith({
      caseId: mockCase.id,
      signal: abortCtrl.signal,
      page: 0,
      perPage: 10,
    });
  });

  it('calls does not call getSimilarCases when enabled=false', async () => {
    const spyOnGetCases = vi.spyOn(api, 'getSimilarCases');
    renderHook(
      () => useGetSimilarCases({ caseId: mockCase.id, perPage: 10, page: 0, enabled: false }),
      {
        wrapper: TestProviders,
      }
    );

    expect(spyOnGetCases).not.toHaveBeenCalled();
  });

  it('shows a toast error message when an error occurs in the response', async () => {
    const spyOnGetCases = vi.spyOn(api, 'getSimilarCases');
    spyOnGetCases.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    const addError = vi.fn();
    (useToasts as Mock).mockReturnValue({ addSuccess, addError });

    renderHook(
      () => useGetSimilarCases({ caseId: mockCase.id, perPage: 10, page: 0, enabled: true }),
      {
        wrapper: TestProviders,
      }
    );

    await waitFor(() => {
      expect(addError).toHaveBeenCalled();
    });
  });
});
