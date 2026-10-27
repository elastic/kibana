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

const pickerColumns = [
  { field: 'createdAt', name: 'Created on', isChecked: true },
  { field: 'updatedAt', name: 'Updated on', isChecked: true },
];
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

  describe('sorting', () => {
    beforeEach(() => {
      useGetSimilarCasesMock.mockReturnValue({
        data: {
          cases: [{ ...basicCase, similarities: { observables: mockSimilarObservables } }],
          page: 1,
          perPage: 10,
          total: 30,
        },
        isLoading: false,
      });
    });

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

      await userEvent.click(await screen.findByTestId('pagination-button-1'));
      await userEvent.click(await screen.findByRole('button', { name: /Name/ }));

      expect(useGetSimilarCasesMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          sortField: SortFieldCase.title,
          sortOrder: 'asc',
          page: 1,
        })
      );
    });

    it('keeps the current sort when the page changes', async () => {
      renderWithTestingProviders(<CaseViewSimilarCases caseData={caseData} />);

      await userEvent.click(await screen.findByRole('button', { name: /Name/ }));
      await userEvent.click(await screen.findByTestId('pagination-button-1'));

      expect(useGetSimilarCasesMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          sortField: SortFieldCase.title,
          sortOrder: 'asc',
          page: 2,
        })
      );
    });

    describe('hiding a column', () => {
      const hideColumn = async (field: string) => {
        await userEvent.click(await screen.findByTestId('column-selection-popover-button'));
        const user = userEvent.setup({ pointerEventsCheck: 0 });
        await user.click(await screen.findByTestId(`column-selection-switch-${field}`));
      };

      it('passes the new selection to setPickerColumns', async () => {
        renderWithTestingProviders(<CaseViewSimilarCases caseData={caseData} />);

        await hideColumn('createdAt');

        expect(setPickerColumns).toHaveBeenLastCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ field: 'createdAt', isChecked: false }),
            expect.objectContaining({ field: 'updatedAt', isChecked: true }),
          ])
        );
      });

      it('keeps the current sort and page when the hidden column is not the sorted one', async () => {
        renderWithTestingProviders(<CaseViewSimilarCases caseData={caseData} />);

        await userEvent.click(await screen.findByRole('button', { name: /Updated on/ }));
        await userEvent.click(await screen.findByTestId('pagination-button-1'));
        await hideColumn('createdAt');

        expect(useGetSimilarCasesMock).toHaveBeenLastCalledWith(
          expect.objectContaining({
            sortField: SortFieldCase.updatedAt,
            sortOrder: 'asc',
            page: 2,
          })
        );
      });

      it('keeps the current page when the sort is already the default', async () => {
        renderWithTestingProviders(<CaseViewSimilarCases caseData={caseData} />);

        await userEvent.click(await screen.findByTestId('pagination-button-1'));
        await hideColumn('createdAt');

        expect(useGetSimilarCasesMock).toHaveBeenLastCalledWith(
          expect.objectContaining({
            sortField: SortFieldCase.createdAt,
            sortOrder: 'desc',
            page: 2,
          })
        );
      });

      it('falls back to the default sort and resets to page 1 when the sort is not the default', async () => {
        renderWithTestingProviders(<CaseViewSimilarCases caseData={caseData} />);

        await userEvent.click(await screen.findByRole('button', { name: /Created on/ }));
        await userEvent.click(await screen.findByTestId('pagination-button-1'));
        await hideColumn('createdAt');

        expect(useGetSimilarCasesMock).toHaveBeenLastCalledWith(
          expect.objectContaining({
            sortField: SortFieldCase.createdAt,
            sortOrder: 'desc',
            page: 1,
          })
        );
      });

      it('falls back to the default sort when a non-default field is sorted descending', async () => {
        renderWithTestingProviders(<CaseViewSimilarCases caseData={caseData} />);

        await userEvent.click(await screen.findByRole('button', { name: /Updated on/ }));
        await userEvent.click(await screen.findByRole('button', { name: /Updated on/ }));
        await userEvent.click(await screen.findByTestId('pagination-button-1'));
        await hideColumn('updatedAt');

        expect(useGetSimilarCasesMock).toHaveBeenLastCalledWith(
          expect.objectContaining({
            sortField: SortFieldCase.createdAt,
            sortOrder: 'desc',
            page: 1,
          })
        );
      });
    });
  });
});
