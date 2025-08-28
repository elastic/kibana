/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { waitFor, renderHook, act } from '@testing-library/react';
import { basicCase } from './mock';
import * as api from './api';
import { TestProviders } from '../common/mock';
import { useToasts } from '../common/lib/kibana';
import { useGetCaseSummary } from './use_get_case_summary';

jest.mock('./api');
jest.mock('../common/lib/kibana');

const wrapper: FC<PropsWithChildren<unknown>> = ({ children }) => (
  <TestProviders>{children}</TestProviders>
);

describe('useGetCaseSummary', () => {
  const abortCtrl = new AbortController();
  const connectorId: string = 'connector-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not call getCaseSummary without refetch', async () => {
    const spyOnGetCaseSummary = jest.spyOn(api, 'getCaseSummary');

    renderHook(() => useGetCaseSummary(basicCase.id, connectorId), {
      wrapper,
    });

    expect(spyOnGetCaseSummary).not.toHaveBeenCalled();
  });

  it('calls getCaseSummary on refetch with correct arguments', async () => {
    const spyOnGetCaseSummary = jest.spyOn(api, 'getCaseSummary');

    const { result } = renderHook(() => useGetCaseSummary(basicCase.id, connectorId), {
      wrapper,
    });

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() =>
      expect(spyOnGetCaseSummary).toBeCalledWith(basicCase.id, connectorId, abortCtrl.signal)
    );
  });

  it('shows an error toast when getCaseSummary throws', async () => {
    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addError });

    const spyOnGetCaseSummary = jest.spyOn(api, 'getCaseSummary');
    spyOnGetCaseSummary.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    const { result } = renderHook(() => useGetCaseSummary(basicCase.id, connectorId), {
      wrapper,
    });

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(addError).toHaveBeenCalled();
    });
  });
});
