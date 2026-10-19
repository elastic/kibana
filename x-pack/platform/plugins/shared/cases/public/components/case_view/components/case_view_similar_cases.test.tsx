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
import { CaseViewSimilarCases } from './case_view_similar_cases';
import { renderWithTestingProviders } from '../../../common/mock';
import { useGetCaseConfiguration } from '../../../containers/configure/use_get_case_configuration';
import { useCaseConfigureResponse } from '../../configure_cases/__mock__';
import { useSimilarCasesColumnsSelection } from '../../similar_cases/use_similar_cases_columns_selection';

jest.mock('../../../common/lib/kibana');
jest.mock('./sidebar/sidebar_toggle_button', () => ({
  SidebarToggleButton: () => <div data-test-subj="case-view-sidebar-toggle" />,
}));
jest.mock('../../../containers/configure/use_get_case_configuration');
jest.mock('../../similar_cases/use_similar_cases_columns_selection');

const useGetCaseConfigurationMock = useGetCaseConfiguration as jest.Mock;
const useSimilarCasesColumnsSelectionMock = useSimilarCasesColumnsSelection as jest.Mock;

const caseData: CaseUI = {
  ...basicCase,
  comments: [...basicCase.comments, alertCommentWithIndices],
};

const pickerColumns = [{ field: 'createdAt', name: 'Created on', isChecked: true }];
const tableColumns = [{ field: 'title', name: 'Name', isChecked: true }, ...pickerColumns];

const setPickerColumns = jest.fn();

// Failing: See https://github.com/elastic/kibana/issues/207056
describe('Case View Page similar cases tab', () => {
  beforeEach(() => {
    useGetCaseConfigurationMock.mockReturnValue(useCaseConfigureResponse);
    useSimilarCasesColumnsSelectionMock.mockReturnValue({
      pickerColumns,
      tableColumns,
      setPickerColumns,
    });
    jest.clearAllMocks();
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

  it('does not offer the name column in the columns popover', async () => {
    renderWithTestingProviders(<CaseViewSimilarCases caseData={caseData} />);

    await userEvent.click(await screen.findByTestId('column-selection-popover-button'));

    expect(await screen.findByTestId('column-selection-switch-createdAt')).toBeInTheDocument();
    expect(screen.queryByTestId('column-selection-switch-title')).not.toBeInTheDocument();
  });

  it('passes the new picker selection to the selection hook when columns change', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderWithTestingProviders(<CaseViewSimilarCases caseData={caseData} />);

    await user.click(await screen.findByTestId('column-selection-popover-button'));
    await user.click(await screen.findByTestId('column-selection-popover-hide-all-button'));

    await waitFor(() => expect(setPickerColumns).toHaveBeenCalled());
    const [newColumns] = setPickerColumns.mock.calls[0];
    expect(newColumns.every(({ isChecked }: { isChecked: boolean }) => !isChecked)).toBe(true);
  });

  it('shows the name column from the table columns', async () => {
    renderWithTestingProviders(<CaseViewSimilarCases caseData={caseData} />);

    expect(await screen.findByTestId('similar-cases-table')).toBeInTheDocument();
    expect(await screen.findByRole('columnheader', { name: /name/i })).toBeInTheDocument();
  });
});
