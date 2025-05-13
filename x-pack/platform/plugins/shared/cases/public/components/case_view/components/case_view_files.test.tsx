/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { CaseUI } from '../../../../common';

import { alertCommentWithIndices, basicCase } from '../../../containers/mock';
import { useGetCaseFiles } from '../../../containers/use_get_case_files';
import { CaseViewFiles, DEFAULT_CASE_FILES_FILTERING_OPTIONS } from './case_view_files';
import { renderWithTestingProviders } from '../../../common/mock';

jest.mock('../../../containers/use_get_case_files');

const useGetCaseFilesMock = useGetCaseFiles as jest.Mock;

const caseData: CaseUI = {
  ...basicCase,
  comments: [...basicCase.comments, alertCommentWithIndices],
};

describe('Case View Page files tab', () => {
  useGetCaseFilesMock.mockReturnValue({
    data: { files: [], total: 11 },
    isLoading: false,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the utility bar for the files table', async () => {
    renderWithTestingProviders(<CaseViewFiles caseData={caseData} />);

    expect((await screen.findAllByTestId('cases-files-add')).length).toBe(2);
    expect(await screen.findByTestId('cases-files-search')).toBeInTheDocument();
  });

  it('should render the files table', async () => {
    renderWithTestingProviders(<CaseViewFiles caseData={caseData} />);

    expect(await screen.findByTestId('cases-files-table')).toBeInTheDocument();
  });

  it('clicking table pagination triggers calls to useGetCaseFiles', async () => {
    renderWithTestingProviders(<CaseViewFiles caseData={caseData} />);

    expect(await screen.findByTestId('cases-files-table')).toBeInTheDocument();

    await userEvent.click(await screen.findByTestId('pagination-button-next'));

    await waitFor(() =>
      expect(useGetCaseFilesMock).toHaveBeenCalledWith({
        caseId: basicCase.id,
        page: DEFAULT_CASE_FILES_FILTERING_OPTIONS.page + 1,
        perPage: DEFAULT_CASE_FILES_FILTERING_OPTIONS.perPage,
      })
    );
  });

  it('changing perPage value triggers calls to useGetCaseFiles', async () => {
    const targetPagination = 50;

    renderWithTestingProviders(<CaseViewFiles caseData={caseData} />);

    expect(await screen.findByTestId('cases-files-table')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('tablePaginationPopoverButton'));

    const pageSizeOption = screen.getByTestId('tablePagination-50-rows');

    pageSizeOption.style.pointerEvents = 'all';

    await userEvent.click(pageSizeOption);

    await waitFor(() =>
      expect(useGetCaseFilesMock).toHaveBeenCalledWith({
        caseId: basicCase.id,
        page: DEFAULT_CASE_FILES_FILTERING_OPTIONS.page,
        perPage: targetPagination,
      })
    );
  });

  it('search by word triggers calls to useGetCaseFiles', async () => {
    renderWithTestingProviders(<CaseViewFiles caseData={caseData} />);

    expect(await screen.findByTestId('cases-files-table')).toBeInTheDocument();

    await userEvent.type(screen.getByTestId('cases-files-search'), 'Foobar{enter}');

    await waitFor(() =>
      expect(useGetCaseFilesMock).toHaveBeenCalledWith({
        caseId: basicCase.id,
        page: DEFAULT_CASE_FILES_FILTERING_OPTIONS.page,
        perPage: DEFAULT_CASE_FILES_FILTERING_OPTIONS.perPage,
        searchTerm: 'Foobar',
      })
    );
  });
});
