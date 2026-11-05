/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RunWorkflowExecutor } from '@kbn/workflows-ui';
import { renderWithTestingProviders } from '../../common/mock';
import { ObservablesBulkActions } from './observables_bulk_actions';
import { mockCase, mockObservables } from '../../containers/mock';
import { OBSERVABLES_WORKFLOW_ORIGIN_TYPE } from '../../../common/types/domain/user_action/workflow/constants';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';
import { useCaseConfigureResponse } from '../configure_cases/__mock__';
import { useBulkDeleteObservables } from '../../containers/use_bulk_delete_observables';

jest.mock('../../containers/configure/use_get_case_configuration');
jest.mock('../workflows/use_cases_workflow_executor', () => ({
  useCasesWorkflowExecutor: jest.fn().mockReturnValue(jest.fn()),
}));

jest.mock('../../containers/use_bulk_delete_observables');

// Stub RunWorkflowPanel (which RunCaseWorkflowModal renders) so it does not need
// useKibana / react-query HTTP. The modal's own test-subj is still exercised.
jest.mock('@kbn/workflows-ui', () => ({
  RunWorkflowPanel: ({
    onClose,
    runWorkflow,
    showSuccessToast,
  }: {
    onClose: () => void;
    runWorkflow?: RunWorkflowExecutor;
    showSuccessToast?: boolean;
  }) => (
    <div data-test-subj="run-workflow-panel-mock">
      <span data-test-subj="panel-has-executor">{runWorkflow ? 'yes' : 'no'}</span>
      <span data-test-subj="panel-show-success-toast">{String(showSuccessToast)}</span>
      <button data-test-subj="panel-close" type="button" onClick={onClose}>
        {'Close'}
      </button>
    </div>
  ),
}));

describe('ObservablesBulkActions', () => {
  let user: ReturnType<typeof userEvent.setup>;
  const bulkDeleteObservablesMock = jest.fn();

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime, pointerEventsCheck: 0 });
    jest.clearAllMocks();
    const { useCasesWorkflowExecutor } = jest.requireMock(
      '../workflows/use_cases_workflow_executor'
    );
    (useCasesWorkflowExecutor as jest.Mock).mockReturnValue(jest.fn());
    (useGetCaseConfiguration as jest.Mock).mockReturnValue(useCaseConfigureResponse);
    (useBulkDeleteObservables as jest.Mock).mockReturnValue({
      mutate: bulkDeleteObservablesMock,
      isLoading: false,
    });
  });

  it('renders nothing when no observables are selected', () => {
    renderWithTestingProviders(
      <ObservablesBulkActions caseData={mockCase} selectedObservables={[]} canRunWorkflow={true} />
    );
    expect(screen.queryByTestId('cases-observables-selected-count')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cases-observables-bulk-actions-button')).not.toBeInTheDocument();
  });

  it('renders the selected count badge for a non-empty selection', async () => {
    renderWithTestingProviders(
      <ObservablesBulkActions
        caseData={mockCase}
        selectedObservables={mockObservables}
        canRunWorkflow={true}
      />
    );
    expect(await screen.findByTestId('cases-observables-selected-count')).toBeInTheDocument();
  });

  it('opens the bulk-actions popover and reveals the run workflow item on button click', async () => {
    renderWithTestingProviders(
      <ObservablesBulkActions
        caseData={mockCase}
        selectedObservables={mockObservables}
        canRunWorkflow={true}
      />
    );
    await user.click(await screen.findByTestId('cases-observables-bulk-actions-button'));
    expect(
      await screen.findByTestId('cases-observables-bulk-actions-context-menu')
    ).toBeInTheDocument();
    expect(screen.getByTestId('cases-observables-bulk-actions-run-workflow')).toBeInTheDocument();
  });

  it('opens the run workflow modal when the run workflow item is clicked', async () => {
    renderWithTestingProviders(
      <ObservablesBulkActions
        caseData={mockCase}
        selectedObservables={mockObservables}
        canRunWorkflow={true}
      />
    );
    await user.click(await screen.findByTestId('cases-observables-bulk-actions-button'));
    await user.click(screen.getByTestId('cases-observables-bulk-actions-run-workflow'));
    expect(await screen.findByTestId('cases-run-workflow-modal')).toBeInTheDocument();
  });

  it('passes the cases.observables origin with the selected observable ids to useCasesWorkflowExecutor', () => {
    renderWithTestingProviders(
      <ObservablesBulkActions
        caseData={mockCase}
        selectedObservables={mockObservables}
        canRunWorkflow={true}
      />
    );
    const { useCasesWorkflowExecutor } = jest.requireMock(
      '../workflows/use_cases_workflow_executor'
    );
    expect(useCasesWorkflowExecutor).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: mockCase.id,
        origin: {
          type: OBSERVABLES_WORKFLOW_ORIGIN_TYPE,
          caseId: mockCase.id,
          observableIds: mockObservables.map(({ id }) => id),
        },
      })
    );
  });

  it('passes showSuccessToast=false to RunWorkflowPanel so the Cases executor owns the toast', async () => {
    renderWithTestingProviders(
      <ObservablesBulkActions
        caseData={mockCase}
        selectedObservables={mockObservables}
        canRunWorkflow={true}
      />
    );
    await user.click(await screen.findByTestId('cases-observables-bulk-actions-button'));
    await user.click(screen.getByTestId('cases-observables-bulk-actions-run-workflow'));
    await screen.findByTestId('cases-run-workflow-modal');
    expect(screen.getByTestId('panel-show-success-toast').textContent).toBe('false');
  });

  it('renders the delete action when the user can update the case', async () => {
    renderWithTestingProviders(
      <ObservablesBulkActions
        caseData={mockCase}
        selectedObservables={mockObservables}
        canRunWorkflow={false}
      />
    );
    await user.click(await screen.findByTestId('cases-observables-bulk-actions-button'));
    expect(screen.getByTestId('cases-observables-bulk-actions-delete')).toBeInTheDocument();
    expect(
      screen.queryByTestId('cases-observables-bulk-actions-run-workflow')
    ).not.toBeInTheDocument();
  });

  it('shows a confirmation modal when delete is clicked', async () => {
    renderWithTestingProviders(
      <ObservablesBulkActions
        caseData={mockCase}
        selectedObservables={mockObservables}
        canRunWorkflow={false}
      />
    );
    await user.click(await screen.findByTestId('cases-observables-bulk-actions-button'));
    await user.click(screen.getByTestId('cases-observables-bulk-actions-delete'));

    expect(await screen.findByText('Delete 2 observables?')).toBeInTheDocument();
    expect(
      screen.getByText('Are you sure you want to delete these observables?')
    ).toBeInTheDocument();
  });

  it('calls bulkDeleteObservables when deletion is confirmed', async () => {
    renderWithTestingProviders(
      <ObservablesBulkActions
        caseData={mockCase}
        selectedObservables={mockObservables}
        canRunWorkflow={false}
      />
    );
    await user.click(await screen.findByTestId('cases-observables-bulk-actions-button'));
    await user.click(screen.getByTestId('cases-observables-bulk-actions-delete'));
    await user.click(screen.getByTestId('confirmModalConfirmButton'));

    await waitFor(() => {
      expect(bulkDeleteObservablesMock).toHaveBeenCalledWith({
        observableIds: mockObservables.map(({ id }) => id),
      });
    });
  });

  it('calls onActionSuccess after a successful bulk delete', async () => {
    const onActionSuccess = jest.fn();
    (useBulkDeleteObservables as jest.Mock).mockImplementation((_caseId, { onSuccess } = {}) => ({
      mutate: () => onSuccess?.(),
      isLoading: false,
    }));

    renderWithTestingProviders(
      <ObservablesBulkActions
        caseData={mockCase}
        selectedObservables={mockObservables}
        canRunWorkflow={false}
        onActionSuccess={onActionSuccess}
      />
    );
    await user.click(await screen.findByTestId('cases-observables-bulk-actions-button'));
    await user.click(screen.getByTestId('cases-observables-bulk-actions-delete'));
    await user.click(screen.getByTestId('confirmModalConfirmButton'));

    await waitFor(() => {
      expect(onActionSuccess).toHaveBeenCalled();
    });
  });
});
