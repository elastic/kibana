/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import * as api from './api';
import { SECURITY_SOLUTION_OWNER } from '../../common/constants';
import { useGetTags } from './use_get_tags';
import { useToasts } from '../common/lib/kibana';
import { useCasesContext } from '../components/cases_context/use_cases_context';

jest.mock('./api');
jest.mock('../common/lib/kibana');
jest.mock('../components/cases_context/use_cases_context', () => ({
  useCasesContext: jest.fn(),
}));

describe('useGetTags', () => {
  const abortCtrl = new AbortController();

  const getWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    return function Wrapper({ children }: React.PropsWithChildren<{}>) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useCasesContext as jest.Mock).mockReturnValue({ owner: [SECURITY_SOLUTION_OWNER] });
  });

  it('calls getTags api', () => {
    const spyOnGetTags = jest.spyOn(api, 'getTags');
    renderHook(() => useGetTags(), { wrapper: getWrapper() });

    expect(spyOnGetTags).toHaveBeenCalledWith({
      owner: [SECURITY_SOLUTION_OWNER],
      signal: abortCtrl.signal,
    });
  });

  it('displays and error toast when an error occurs', async () => {
    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addError });
    const spyOnGetTags = jest.spyOn(api, 'getTags');
    spyOnGetTags.mockImplementation(() => {
      throw new Error('Something went wrong');
    });
    renderHook(() => useGetTags(), { wrapper: getWrapper() });

    await waitFor(() => expect(addError).toHaveBeenCalled());
  });
});
