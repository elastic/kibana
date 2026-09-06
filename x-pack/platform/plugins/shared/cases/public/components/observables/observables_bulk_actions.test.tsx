/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RunWorkflowExecutor } from '@kbn/workflows-ui';
import { renderWithTestingProviders } from '../../common/mock';
import { ObservablesBulkActions } from './observables_bulk_actions';
import { mockCase, mockObservables } from '../../containers/mock';
import { OBSERVABLES_WORKFLOW_ORIGIN_TYPE } from '../../../common/types/domain/user_action/workflow/constants';

jest.mock('../workflows/use_cases_workflow_executor', () => ({
  // Partial mock — only stubs useCasesWorkflowExecutor; useOptionalCasesWorkflowExecutor is
  // undefined here. If a future test renders a tree that calls the optional hook, add it.
  useCasesWorkflowExecutor: jest.fn().mockReturnValue(jest.fn()),
}));

// Stub RunWorkflowPanel (which RunCaseWorkflowModal renders) so it does not need
// useKibana / react-query HTTP. The modal's own test-subj is still exercised.
jest.mock('@kbn/workflows-ui', () => ({
  RunWorkflowPanel: ({
    onClose,
    runWorkflow,
  }: {
    onClose: () => void;
    runWorkflow?: RunWorkflowExecutor;
  }) => (
    <div data-test-subj="run-workflow-panel-mock">
      <span data-test-subj="panel-has-executor">{runWorkflow ? 'yes' : 'no'}</span>
      <button data-test-subj="panel-close" type="button" onClick={onClose}>
        {'Close'}
      </button>
    </div>
  ),
}));

describe('ObservablesBulkActions', () => {
  let user: ReturnType<typeof userEvent.setup>;

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
  });

  it('renders nothing when no observables are selected', () => {
    renderWithTestingProviders(
      <ObservablesBulkActions caseData={mockCase} selectedObservables={[]} />
    );
    expect(screen.queryByTestId('cases-observables-selected-count')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cases-observables-bulk-actions-button')).not.toBeInTheDocument();
  });

  it('renders the selected count badge for a non-empty selection', async () => {
    renderWithTestingProviders(
      <ObservablesBulkActions caseData={mockCase} selectedObservables={mockObservables} />
    );
    expect(await screen.findByTestId('cases-observables-selected-count')).toBeInTheDocument();
  });

  it('opens the bulk-actions popover and reveals the run workflow item on button click', async () => {
    renderWithTestingProviders(
      <ObservablesBulkActions caseData={mockCase} selectedObservables={mockObservables} />
    );
    await user.click(await screen.findByTestId('cases-observables-bulk-actions-button'));
    expect(
      await screen.findByTestId('cases-observables-bulk-actions-context-menu')
    ).toBeInTheDocument();
    expect(screen.getByTestId('cases-observables-bulk-actions-run-workflow')).toBeInTheDocument();
  });

  it('opens the run workflow modal when the run workflow item is clicked', async () => {
    renderWithTestingProviders(
      <ObservablesBulkActions caseData={mockCase} selectedObservables={mockObservables} />
    );
    await user.click(await screen.findByTestId('cases-observables-bulk-actions-button'));
    await user.click(screen.getByTestId('cases-observables-bulk-actions-run-workflow'));
    expect(await screen.findByTestId('cases-run-workflow-modal')).toBeInTheDocument();
  });

  it('passes the cases.observables origin with the selected observable ids to useCasesWorkflowExecutor', () => {
    renderWithTestingProviders(
      <ObservablesBulkActions caseData={mockCase} selectedObservables={mockObservables} />
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
});
