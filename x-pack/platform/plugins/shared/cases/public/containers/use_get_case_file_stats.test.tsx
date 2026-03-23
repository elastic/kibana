/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, renderHook } from '@testing-library/react';
import { createMockFilesClient } from '@kbn/shared-ux-file-mocks';

import { basicCase } from './mock';
import { TestProviders, mockedTestProvidersOwner } from '../common/mock';
import { useToasts } from '../common/lib/kibana';
import { useGetCaseFileStats } from './use_get_case_file_stats';
import { constructFileKindIdByOwner } from '../../common/files';

jest.mock('../common/lib/kibana');

const searchTerm = 'foobar';
const hookParams = {
  caseId: basicCase.id,
};

const expectedCallParams = {
  kind: constructFileKindIdByOwner(mockedTestProvidersOwner[0]),
  page: 1,
  perPage: 1,
  meta: { caseIds: [hookParams.caseId] },
};

describe('useGetCaseFileStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls filesClient.list when searchTerm is not provided', async () => {
    const filesClient = createMockFilesClient();

    renderHook(() => useGetCaseFileStats(hookParams), {
      wrapper: (props) => <TestProviders {...props} filesClient={filesClient} />,
    });

    await waitFor(() => expect(filesClient.list).toHaveBeenCalledWith(expectedCallParams));
  });

  it('calls filesClient.list with correct arguments when searchTerm is provided', async () => {
    const filesClient = createMockFilesClient();
    const hookParamsWithSearchTerm = { ...hookParams, searchTerm };
    renderHook(() => useGetCaseFileStats(hookParamsWithSearchTerm), {
      wrapper: (props) => <TestProviders {...props} filesClient={filesClient} />,
    });
    await waitFor(() =>
      expect(filesClient.list).toHaveBeenCalledWith({
        ...expectedCallParams,
        name: `*${searchTerm}*`,
      })
    );
  });

  it('shows an error toast when filesClient.list throws', async () => {
    const filesClient = createMockFilesClient();
    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addError });

    filesClient.list = jest.fn().mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    renderHook(() => useGetCaseFileStats(hookParams), {
      wrapper: (props) => <TestProviders {...props} filesClient={filesClient} />,
    });

    await waitFor(() => {
      expect(filesClient.list).toHaveBeenCalledWith(expectedCallParams);
    });

    await waitFor(() => {
      expect(addError).toHaveBeenCalled();
    });
  });
});
