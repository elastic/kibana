/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import * as api from './api';
import type { AppMockRenderer } from '../common/mock';
import { createAppMockRenderer } from '../common/mock';
import { useToasts } from '../common/lib/kibana/hooks';
import { useGetSimilarCases } from './use_get_similar_cases';
import { mockCase } from './mock';

jest.mock('./api');
jest.mock('../common/lib/kibana/hooks');

describe('useGetSimilarCases', () => {
  const abortCtrl = new AbortController();
  const addSuccess = jest.fn();
  (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError: jest.fn() });

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('calls getSimilarCases with correct arguments', async () => {
    const spyOnGetCases = jest.spyOn(api, 'getSimilarCases');
    renderHook(
      () => useGetSimilarCases({ caseId: mockCase.id, perPage: 10, page: 0, enabled: true }),
      {
        wrapper: appMockRender.AppWrapper,
      }
    );

    await waitFor(() => {
      expect(spyOnGetCases).toBeCalled();
    });

    expect(spyOnGetCases).toBeCalledWith({
      caseId: mockCase.id,
      signal: abortCtrl.signal,
      page: 0,
      perPage: 10,
    });
  });

  it('calls does not call getSimilarCases when enabled=false', async () => {
    const spyOnGetCases = jest.spyOn(api, 'getSimilarCases');
    renderHook(
      () => useGetSimilarCases({ caseId: mockCase.id, perPage: 10, page: 0, enabled: false }),
      {
        wrapper: appMockRender.AppWrapper,
      }
    );

    expect(spyOnGetCases).not.toBeCalled();
  });

  it('shows a toast error message when an error occurs in the response', async () => {
    const spyOnGetCases = jest.spyOn(api, 'getSimilarCases');
    spyOnGetCases.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError });

    renderHook(
      () => useGetSimilarCases({ caseId: mockCase.id, perPage: 10, page: 0, enabled: true }),
      {
        wrapper: appMockRender.AppWrapper,
      }
    );

    await waitFor(() => {
      expect(addError).toHaveBeenCalled();
    });
  });
});
