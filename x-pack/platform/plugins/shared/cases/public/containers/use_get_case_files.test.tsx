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
import { useGetCaseFiles } from './use_get_case_files';
import * as api from './api';

jest.mock('./api');
jest.mock('../common/lib/kibana');

const hookParams = {
  caseId: basicCase.id,
  page: 1,
  perPage: 1,
  searchTerm: 'foobar',
};

describe('useGetCaseFiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls getCaseFiles with correct arguments', async () => {
    const spy = jest.spyOn(api, 'getCaseFiles').mockResolvedValue({ files: [], total: 0 });

    renderHook(() => useGetCaseFiles(hookParams), {
      wrapper: (props) => <TestProviders {...props} />,
    });

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith({
        caseId: hookParams.caseId,
        page: hookParams.page + 1,
        perPage: hookParams.perPage,
        searchTerm: hookParams.searchTerm,
        signal: expect.any(AbortSignal),
      })
    );
  });

  it('shows an error toast when getCaseFiles throws', async () => {
    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addError });

    jest.spyOn(api, 'getCaseFiles').mockRejectedValue(new Error('Something went wrong'));

    renderHook(() => useGetCaseFiles(hookParams), {
      wrapper: (props) => <TestProviders {...props} />,
    });

    await waitFor(() => {
      expect(addError).toHaveBeenCalled();
    });
  });
});
