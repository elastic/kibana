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
import type { ObservableWithMetadata } from '../../../common/types/api';
import { useObservableFlyoutApi } from './flyout/use_observable_flyout_api';
import { createObservableFlyoutApiMock } from './flyout/use_observable_flyout_api.mock';
import { useCountCasesByObservables } from '../../containers/use_count_cases_by_observables';
import {
  MAX_STORED_OBSERVABLES_PER_CASE,
  OBSERVABLE_TYPE_IPV4,
  OBSERVABLE_TYPES_BUILTIN_KEYS,
} from '../../../common/constants';

// Partial mock: keep createCaseWorkflowFilter / createCaseWorkflowComparator / useRunCaseWorkflow
// real; only pin useCanRunCaseWorkflow so we don't need to wire up its four dependencies.
jest.mock('../workflows/use_run_case_workflow', () => ({
  ...jest.requireActual('../workflows/use_run_case_workflow'),
  useCanRunCaseWorkflow: jest.fn(),
}));
jest.mock('../../containers/use_find_observables');
jest.mock('./flyout/use_observable_flyout_api');
// Its own test covers it; here it would add a `useFindObservables` call of its own.
jest.mock('./flyout/use_open_linked_observable');
jest.mock('../../containers/use_count_cases_by_observables');

const useFindObservablesMock = useFindObservables as jest.Mock;

const mockPage = (
  observables: ObservableWithMetadata[],
  { total = observables.length, cursor }: { total?: number; cursor?: string } = {}
) =>
  useFindObservablesMock.mockReturnValue({
    data: { observables, total, ...(cursor != null && { cursor }) },
    isFetching: false,
    isLoading: false,
  });

const lastFindParams = () => useFindObservablesMock.mock.calls.at(-1)?.[1];

const flyoutApi = createObservableFlyoutApiMock();

const useCountCasesByObservablesMock = jest.mocked(useCountCasesByObservables);
const mockCounts = (
  counts: Array<{ typeKey: string; value: string; total: number }>,
  { isLoading = false }: { isLoading?: boolean } = {}
) =>
  useCountCasesByObservablesMock.mockReturnValue({
    data: isLoading ? undefined : { counts },
    isLoading,
  } as unknown as ReturnType<typeof useCountCasesByObservables>);

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
    jest.mocked(useObservableFlyoutApi).mockReturnValue(flyoutApi);
    mockCounts([]);
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

      expect(useFindObservablesMock).toHaveBeenCalledWith(
        mockCase.id,
        {
          perPage: 20,
          sortField: 'createdAt',
          sortOrder: 'asc',
          typeKeys: OBSERVABLE_TYPES_BUILTIN_KEYS,
        },
        expect.anything()
      );
    });

    it('asks only for the configured types, so observables of a deleted type stay hidden', () => {
      renderWithTestingProviders(<ObservablesTable {...props} />);

      expect(lastFindParams().typeKeys).toEqual(OBSERVABLE_TYPES_BUILTIN_KEYS);
    });

    it('filters by the selected types and starts again from the first page', async () => {
      mockPage(mockObservables, { total: 47_552, cursor: 'cursor-1' });
      renderWithTestingProviders(<ObservablesTable {...props} />);

      await userEvent.click(screen.getByTestId('cases-observables-table-next-page'));
      await userEvent.type(
        screen.getByRole('combobox', { name: 'Filter by type' }),
        `${OBSERVABLE_TYPE_IPV4.label}{enter}`
      );

      expect(lastFindParams()).toEqual(
        expect.objectContaining({ typeKeys: [OBSERVABLE_TYPE_IPV4.key] })
      );
      expect(lastFindParams()).not.toHaveProperty('cursor');
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

      expect(lastFindParams()).toEqual({
        perPage: 50,
        sortField: 'createdAt',
        sortOrder: 'asc',
        typeKeys: OBSERVABLE_TYPES_BUILTIN_KEYS,
      });
    });
  });

  describe('metadata', () => {
    it('shows the metadata of each value as key: value badges', () => {
      mockPage([{ ...mockObservables[0], metadata: { triage: 'confirmed', owner: 'payments' } }]);
      renderWithTestingProviders(<ObservablesTable {...props} />);

      expect(screen.getAllByTestId('observable-metadata-badge-triage')[0]).toHaveTextContent(
        'triage: confirmed'
      );
      expect(screen.getAllByTestId('observable-metadata-badge-owner')[0]).toHaveTextContent(
        'owner: payments'
      );
    });

    it('filters by a metadata key, value or value prefix', async () => {
      renderWithTestingProviders(<ObservablesTable {...props} />);
      const filter = screen.getByRole('combobox', {
        name: 'Filter by metadata: key, key:value or key:value*',
      });

      await userEvent.type(filter, 'triage:Confirmed{enter}');
      await userEvent.type(filter, 'owner:pay*{enter}');
      await userEvent.type(filter, 'reviewed{enter}');

      expect(lastFindParams().metadata).toEqual([
        { key: 'triage', value: 'Confirmed' },
        { key: 'owner', prefix: 'pay' },
        { key: 'reviewed' },
      ]);
    });
  });

  describe('limit', () => {
    it('shows how close the case is to the limit', () => {
      renderWithTestingProviders(
        <ObservablesTable {...props} caseData={{ ...props.caseData, totalObservables: 120 }} />
      );

      expect(screen.getByTestId('cases-observables-limit-usage')).toHaveTextContent(
        `120 of ${MAX_STORED_OBSERVABLES_PER_CASE} observables`
      );
      expect(screen.queryByTestId('cases-observables-limit-near')).not.toBeInTheDocument();
      expect(screen.queryByTestId('cases-observables-limit-reached')).not.toBeInTheDocument();
    });

    it('warns when the case is close to the limit', () => {
      renderWithTestingProviders(
        <ObservablesTable
          {...props}
          caseData={{ ...props.caseData, totalObservables: MAX_STORED_OBSERVABLES_PER_CASE - 10 }}
        />
      );

      expect(screen.getByTestId('cases-observables-limit-near')).toBeInTheDocument();
    });

    it('says that new observables are not added once the case is at the limit', () => {
      renderWithTestingProviders(
        <ObservablesTable
          {...props}
          caseData={{ ...props.caseData, totalObservables: MAX_STORED_OBSERVABLES_PER_CASE }}
        />
      );

      expect(screen.getByTestId('cases-observables-limit-reached')).toBeInTheDocument();
      expect(screen.getAllByTestId('cases-observables-add')[0]).toBeDisabled();
    });
  });

  describe('errors', () => {
    it('shows an error in the table when the observables could not be loaded', () => {
      useFindObservablesMock.mockReturnValue({
        data: undefined,
        isFetching: false,
        isLoading: false,
        isError: true,
      });
      renderWithTestingProviders(<ObservablesTable {...props} />);

      expect(screen.getByText('The observables could not be loaded.')).toBeInTheDocument();
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

  describe('drill-down', () => {
    it('opens the observable flyout from the row', async () => {
      const [observable] = mockObservables;
      renderWithTestingProviders(<ObservablesTable {...props} />);

      await userEvent.click(screen.getByTestId(`cases-observables-table-expand-${observable.id}`));

      expect(flyoutApi.openObservableFlyout).toHaveBeenCalledWith({
        observable,
        caseData: props.caseData,
        typeLabel: OBSERVABLE_TYPE_IPV4.label,
      });
    });
  });

  describe('related cases', () => {
    const [first, second] = mockObservables;

    it('counts the other cases of the owner holding each observable of the page', () => {
      renderWithTestingProviders(<ObservablesTable {...props} />);

      expect(useCountCasesByObservablesMock).toHaveBeenLastCalledWith({
        owner: props.caseData.owner,
        excludeCaseId: props.caseData.id,
        observables: [
          { typeKey: first.typeKey, value: first.value },
          { typeKey: second.typeKey, value: second.value },
        ],
      });
    });

    it('shows each count, and opens the cases tool from it', async () => {
      mockCounts([
        { typeKey: first.typeKey, value: first.value, total: 3 },
        { typeKey: second.typeKey, value: second.value, total: 0 },
      ]);
      renderWithTestingProviders(<ObservablesTable {...props} />);

      const firstCount = screen.getByTestId(`cases-observables-table-related-cases-${first.id}`);
      expect(firstCount).toHaveTextContent('3');
      expect(
        screen.getByTestId(`cases-observables-table-related-cases-${second.id}`)
      ).toBeDisabled();

      await userEvent.click(firstCount);

      expect(flyoutApi.openObservableCases).toHaveBeenCalledWith({
        observable: first,
        caseData: props.caseData,
        typeLabel: OBSERVABLE_TYPE_IPV4.label,
      });
    });

    it('shows a spinner while counting', () => {
      mockCounts([], { isLoading: true });
      renderWithTestingProviders(<ObservablesTable {...props} />);

      expect(
        screen.getByTestId(`cases-observables-table-related-cases-${first.id}Loading`)
      ).toBeInTheDocument();
    });
  });
});
