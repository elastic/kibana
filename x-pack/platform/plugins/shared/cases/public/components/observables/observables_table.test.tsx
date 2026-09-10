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
import { renderWithTestingProviders } from '../../common/mock';

// Partial mock: keep createCaseWorkflowFilter / createCaseWorkflowComparator / useRunCaseWorkflow
// real; only pin useCanRunCaseWorkflow so we don't need to wire up its four dependencies.
jest.mock('../workflows/use_run_case_workflow', () => ({
  ...jest.requireActual('../workflows/use_run_case_workflow'),
  useCanRunCaseWorkflow: jest.fn(),
}));

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

  describe('row selection gating', () => {
    it('shows selection checkboxes when the user can run workflows', () => {
      (useCanRunCaseWorkflow as jest.Mock).mockReturnValue(true);
      renderWithTestingProviders(<ObservablesTable {...props} />);
      // EuiInMemoryTable adds a checkbox for each row plus one "select all" header checkbox.
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it('does not show selection checkboxes for read-only users', () => {
      (useCanRunCaseWorkflow as jest.Mock).mockReturnValue(false);
      renderWithTestingProviders(<ObservablesTable {...props} />);
      expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    });

    it('surfaces the bulk-actions bar after selecting a row', async () => {
      (useCanRunCaseWorkflow as jest.Mock).mockReturnValue(true);
      renderWithTestingProviders(<ObservablesTable {...props} />);

      // Click the first row checkbox (index 0 is the "select all" header checkbox).
      const checkboxes = screen.getAllByRole('checkbox');
      await userEvent.click(checkboxes[1]);

      expect(await screen.findByTestId('cases-observables-selected-count')).toBeInTheDocument();
    });
  });
});
