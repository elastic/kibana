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
import { useGetCaseFiles } from './use_get_case_files';
import { constructFileKindIdByOwner } from '../../common/files';

jest.mock('../common/lib/kibana');

const hookParams = {
  caseId: basicCase.id,
  page: 1,
  perPage: 1,
  searchTerm: 'foobar',
};

const expectedCallParams = {
  kind: constructFileKindIdByOwner(mockedTestProvidersOwner[0]),
  page: hookParams.page + 1,
  name: `*${hookParams.searchTerm}*`,
  perPage: hookParams.perPage,
  meta: { caseIds: [hookParams.caseId] },
};

describe('useGetCaseFiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls filesClient.list with correct arguments', async () => {
    const filesClient = createMockFilesClient();

    renderHook(() => useGetCaseFiles(hookParams), {
      wrapper: (props) => <TestProviders {...props} filesClient={filesClient} />,
    });

    await waitFor(() => expect(filesClient.list).toBeCalledWith(expectedCallParams));
  });

  it('shows an error toast when filesClient.list throws', async () => {
    const filesClient = createMockFilesClient();
    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addError });

    filesClient.list = jest.fn().mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    renderHook(() => useGetCaseFiles(hookParams), {
      wrapper: (props) => <TestProviders {...props} filesClient={filesClient} />,
    });

    await waitFor(() => {
      expect(addError).toHaveBeenCalled();
    });
  });
});
