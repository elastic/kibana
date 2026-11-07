/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, renderHook } from '@testing-library/react';

import { basicCase } from './mock';
import { TestProviders } from '../common/mock';
import { useToasts } from '../common/lib/kibana';
import { useGetCaseFileStats } from './use_get_case_file_stats';
import * as api from './api';

jest.mock('./api');
jest.mock('../common/lib/kibana');

const searchTerm = 'foobar';
const hookParams = {
  caseId: basicCase.id,
};

const expectedCallParams = {
  caseId: hookParams.caseId,
  page: 1,
  perPage: 1,
  searchTerm: undefined,
  signal: expect.any(AbortSignal),
};

describe('useGetCaseFileStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls getCaseFiles when searchTerm is not provided', async () => {
    const spy = jest.spyOn(api, 'getCaseFiles').mockResolvedValue({ files: [], total: 0 });

    renderHook(() => useGetCaseFileStats(hookParams), {
      wrapper: (props) => <TestProviders {...props} />,
    });

    await waitFor(() => expect(spy).toHaveBeenCalledWith(expectedCallParams));
  });

  it('calls getCaseFiles with correct arguments when searchTerm is provided', async () => {
    const spy = jest.spyOn(api, 'getCaseFiles').mockResolvedValue({ files: [], total: 0 });

    renderHook(() => useGetCaseFileStats({ ...hookParams, searchTerm }), {
      wrapper: (props) => <TestProviders {...props} />,
    });

    await waitFor(() => expect(spy).toHaveBeenCalledWith({ ...expectedCallParams, searchTerm }));
  });

  it('shows an error toast when getCaseFiles throws', async () => {
    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addError });

    jest.spyOn(api, 'getCaseFiles').mockRejectedValue(new Error('Something went wrong'));

    renderHook(() => useGetCaseFileStats(hookParams), {
      wrapper: (props) => <TestProviders {...props} />,
    });

    await waitFor(() => {
      expect(addError).toHaveBeenCalled();
    });
  });
});
