/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { CaseUI } from '../../../../common';

import {
  alertCommentWithIndices,
  basicCase,
  mockSimilarObservables,
} from '../../../containers/mock';
import { CaseViewSimilarCases } from './case_view_similar_cases';
import { renderWithTestingProviders } from '../../../common/mock';
import { useGetCaseConfiguration } from '../../../containers/configure/use_get_case_configuration';
import { useCaseConfigureResponse } from '../../configure_cases/__mock__';
import { SortFieldCase } from '../../../../common/ui/types';
import { useGetSimilarCases } from '../../../containers/use_get_similar_cases';
import { useSimilarCasesColumnsSelection } from '../../similar_cases/use_similar_cases_columns_selection';

jest.mock('../../../common/lib/kibana');
jest.mock('./sidebar/sidebar_toggle_button', () => ({
  SidebarToggleButton: () => <div data-test-subj="case-view-sidebar-toggle" />,
}));
jest.mock('../../../containers/configure/use_get_case_configuration');
jest.mock('../../similar_cases/use_similar_cases_columns_selection');
jest.mock('../../../containers/use_get_similar_cases', () => ({
  ...jest.requireActual('../../../containers/use_get_similar_cases'),
  useGetSimilarCases: jest.fn(),
}));

const useGetCaseConfigurationMock = useGetCaseConfiguration as jest.Mock;
const useGetSimilarCasesMock = useGetSimilarCases as jest.Mock;
const useSimilarCasesColumnsSelectionMock = useSimilarCasesColumnsSelection as jest.Mock;

const caseData: CaseUI = {
  ...basicCase,
  comments: [...basicCase.comments, alertCommentWithIndices],
};

const defaultSelectedColumns = [
  { field: 'title', name: 'Name', isChecked: true },
  { field: 'createdAt', name: 'Created on', isChecked: true },
];

// Failing: See https://github.com/elastic/kibana/issues/207056
describe('Case View Page similar cases tab', () => {
  beforeEach(() => {
    useGetCaseConfigurationMock.mockReturnValue(useCaseConfigureResponse);
    useSimilarCasesColumnsSelectionMock.mockReturnValue({
      selectedColumns: defaultSelectedColumns,
      setSelectedColumns: jest.fn(),
    });
    jest.clearAllMocks();
    useGetSimilarCasesMock.mockReturnValue({
      data: {
        cases: [{ ...basicCase, similarities: { observables: mockSimilarObservables } }],
        page: 1,
        perPage: 10,
        total: 1,
      },
      isLoading: false,
    });
  });

  it('should render the similar cases table', async () => {
    renderWithTestingProviders(<CaseViewSimilarCases caseData={caseData} />);

    expect(await screen.findByTestId('similar-cases-table')).toBeInTheDocument();
  });

  it('renders the sidebar toggle button', async () => {
    renderWithTestingProviders(<CaseViewSimilarCases caseData={caseData} />);

    expect(await screen.findByTestId('case-view-sidebar-toggle')).toBeInTheDocument();
  });

  it('renders the columns popover button', async () => {
    renderWithTestingProviders(<CaseViewSimilarCases caseData={caseData} />);

    expect(await screen.findByTestId('column-selection-popover-button')).toBeInTheDocument();
  });

  describe('sorting', () => {
    it('requests the default sort of createdAt descending on first render', async () => {
      renderWithTestingProviders(<CaseViewSimilarCases caseData={caseData} />);

      await screen.findByTestId('similar-cases-table');

      expect(useGetSimilarCasesMock.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          sortField: SortFieldCase.createdAt,
          sortOrder: 'desc',
        })
      );
    });

    it('requests the new sort and resets to page 1 after a header click', async () => {
      renderWithTestingProviders(<CaseViewSimilarCases caseData={caseData} />);

      await userEvent.click(await screen.findByRole('button', { name: /Name/ }));

      expect(useGetSimilarCasesMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          sortField: SortFieldCase.title,
          sortOrder: 'asc',
          page: 1,
        })
      );
    });
  });
});
