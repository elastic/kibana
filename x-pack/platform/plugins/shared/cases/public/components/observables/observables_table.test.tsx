/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockCase, mockObservables } from '../../containers/mock';
import { ObservablesTable, type ObservablesTableProps } from './observables_table';
import { readCasesPermissions, renderWithTestingProviders } from '../../common/mock';
import { useFindObservables } from '../../containers/use_find_observables';
import type { Observable } from '../../../common/types/domain';

// Partial mock: keep createCaseWorkflowFilter / createCaseWorkflowComparator / useRunCaseWorkflow
// real; only pin useCanRunCaseWorkflow so we don't need to wire up its four dependencies.
jest.mock('../workflows/use_run_case_workflow', () => ({
  ...jest.requireActual('../workflows/use_run_case_workflow'),
  useCanRunCaseWorkflow: jest.fn(),
}));
jest.mock('../../containers/use_find_observables');

const useFindObservablesMock = useFindObservables as jest.Mock;

const mockPage = (
  observables: Observable[],
  { total = observables.length, cursor }: { total?: number; cursor?: string } = {}
) =>
  useFindObservablesMock.mockReturnValue({
    data: { observables, total, ...(cursor != null && { cursor }) },
    isFetching: false,
    isLoading: false,
  });

const lastFindParams = () => useFindObservablesMock.mock.calls.at(-1)?.[1];

describe('ObservablesTable', () => {
  const { useCanRunCaseWorkflow } = jest.requireMock('../workflows/use_run_case_workflow');

  const props: ObservablesTableProps = {
    caseData: {
      ...mockCase,
      observables: mockObservables,
    },
    isLoading: false,
    onExtractObservablesChanged: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: workflow runs disabled (mirrors a read-only user or feature-off state).
    (useCanRunCaseWorkflow as jest.Mock).mockReturnValue(false);
    mockPage(mockObservables);
  });

  it('renders correctly', async () => {
    renderWithTestingProviders(<ObservablesTable {...props} />);

    expect(screen.getByTestId('cases-observables-table')).toBeInTheDocument();

    expect(screen.getByText('Showing 2 observables')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
  });

  it('renders loading indicator when loading', async () => {
    renderWithTestingProviders(<ObservablesTable {...props} isLoading={true} />);
    expect(screen.queryByTestId('cases-observables-table')).not.toBeInTheDocument();
    expect(screen.getByTestId('cases-observables-table-loading')).toBeInTheDocument();
  });

  describe('server paging', () => {
    it('requests the first page sorted by creation date', () => {
      renderWithTestingProviders(<ObservablesTable {...props} />);

      expect(useFindObservablesMock).toHaveBeenCalledWith(mockCase.id, {
        perPage: 20,
        sortField: 'createdAt',
        sortOrder: 'asc',
      });
    });

    it('shows the total from the server rather than the case preview', () => {
      mockPage(mockObservables, { total: 47_552, cursor: 'cursor-1' });
      renderWithTestingProviders(<ObservablesTable {...props} />);

      expect(screen.getByText('Showing 47552 observables')).toBeInTheDocument();
      expect(screen.getByTestId('cases-observables-table-page-range')).toHaveTextContent(
        '1–2 of 47552'
      );
    });

    it('moves forward with the cursor and back to the previous page', async () => {
      mockPage(mockObservables, { total: 47_552, cursor: 'cursor-1' });
      renderWithTestingProviders(<ObservablesTable {...props} />);

      expect(screen.getByTestId('cases-observables-table-previous-page')).toBeDisabled();
      await userEvent.click(screen.getByTestId('cases-observables-table-next-page'));
      expect(lastFindParams()).toEqual(expect.objectContaining({ cursor: 'cursor-1' }));

      await userEvent.click(screen.getByTestId('cases-observables-table-previous-page'));
      expect(lastFindParams()).not.toHaveProperty('cursor');
    });

    it('disables the next page on the last page', () => {
      mockPage(mockObservables, { total: mockObservables.length, cursor: 'cursor-1' });
      renderWithTestingProviders(<ObservablesTable {...props} />);

      expect(screen.getByTestId('cases-observables-table-next-page')).toBeDisabled();
    });

    it('sends the search term to the server', () => {
      renderWithTestingProviders(<ObservablesTable {...props} searchTerm="10.0" />);

      expect(lastFindParams()).toEqual(expect.objectContaining({ search: '10.0' }));
    });

    it('sorts on the server when a column header is clicked', async () => {
      renderWithTestingProviders(<ObservablesTable {...props} />);

      await userEvent.click(screen.getByRole('button', { name: /Name/ }));

      expect(lastFindParams()).toEqual(
        expect.objectContaining({ sortField: 'value', sortOrder: 'asc' })
      );
    });

    it('starts again from the first page when the page size changes', async () => {
      mockPage(mockObservables, { total: 47_552, cursor: 'cursor-1' });
      renderWithTestingProviders(<ObservablesTable {...props} />);

      await userEvent.click(screen.getByTestId('cases-observables-table-next-page'));
      await userEvent.selectOptions(screen.getByTestId('cases-observables-table-page-size'), '50');

      expect(lastFindParams()).toEqual({ perPage: 50, sortField: 'createdAt', sortOrder: 'asc' });
    });
  });

  describe('row selection gating', () => {
    it('shows selection checkboxes when the user can run workflows', () => {
      (useCanRunCaseWorkflow as jest.Mock).mockReturnValue(true);
      renderWithTestingProviders(<ObservablesTable {...props} />);
      // EuiBasicTable adds a checkbox for each row plus one "select all" header checkbox.
      expect(screen.getAllByRole('checkbox')).toHaveLength(mockObservables.length + 1);
    });

    it('does not show selection checkboxes for read-only users', () => {
      (useCanRunCaseWorkflow as jest.Mock).mockReturnValue(false);
      renderWithTestingProviders(<ObservablesTable {...props} />, {
        wrapperProps: { permissions: readCasesPermissions() },
      });
      expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    });

    it('shows selection checkboxes when the user can update the case', () => {
      (useCanRunCaseWorkflow as jest.Mock).mockReturnValue(false);
      renderWithTestingProviders(<ObservablesTable {...props} />);
      expect(screen.getAllByRole('checkbox')).toHaveLength(mockObservables.length + 1);
    });

    it('surfaces the bulk-actions bar after selecting a row', async () => {
      (useCanRunCaseWorkflow as jest.Mock).mockReturnValue(true);
      renderWithTestingProviders(<ObservablesTable {...props} />);

      // Click the first row checkbox (index 0 is the "select all" header checkbox).
      const checkboxes = screen.getAllByRole('checkbox');
      await userEvent.click(checkboxes[1]);

      expect(await screen.findByTestId('cases-observables-selected-count')).toBeInTheDocument();
    });

    it('does not restore a selection that left the page once it comes back', async () => {
      (useCanRunCaseWorkflow as jest.Mock).mockReturnValue(true);
      const [firstObservable, secondObservable] = mockObservables;
      const { rerender } = renderWithTestingProviders(<ObservablesTable {...props} />);

      await userEvent.click(screen.getAllByRole('checkbox')[1]);
      expect(await screen.findByTestId('cases-observables-selected-count')).toBeInTheDocument();

      mockPage([secondObservable]);
      rerender(<ObservablesTable {...props} />);
      expect(screen.queryByTestId('cases-observables-selected-count')).not.toBeInTheDocument();

      mockPage([firstObservable, secondObservable]);
      rerender(<ObservablesTable {...props} />);
      expect(screen.queryByTestId('cases-observables-selected-count')).not.toBeInTheDocument();
      expect(screen.queryAllByRole('checkbox', { checked: true })).toHaveLength(0);
    });
  });
});
