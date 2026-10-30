/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { RunWorkflowExecutor } from '@kbn/workflows-ui';
import { RunCaseWorkflowModal } from './run_case_workflow_modal';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';
import { useCaseConfigureResponse } from '../configure_cases/__mock__';

jest.mock('../../containers/configure/use_get_case_configuration');

const useGetCaseConfigurationMock = useGetCaseConfiguration as jest.Mock;

// Mock the RunWorkflowPanel from the workflows-ui package.
jest.mock('@kbn/workflows-ui', () => ({
  RunWorkflowPanel: ({
    onClose,
    onExecutionSettled,
    inputs,
    runWorkflow,
    showSuccessToast,
    telemetry,
  }: {
    onClose: () => void;
    onExecutionSettled?: () => void;
    inputs: unknown;
    runWorkflow?: RunWorkflowExecutor;
    showSuccessToast?: boolean;
    telemetry?: unknown;
  }) => (
    <div data-test-subj="run-workflow-panel-mock">
      <span data-test-subj="panel-inputs">{JSON.stringify(inputs)}</span>
      <button data-test-subj="panel-close" type="button" onClick={onClose}>
        {'Close'}
      </button>
      <button
        data-test-subj="panel-settled"
        type="button"
        onClick={onExecutionSettled}
        disabled={!onExecutionSettled}
      >
        {'Settled'}
      </button>
      <span data-test-subj="panel-has-executor">{runWorkflow ? 'yes' : 'no'}</span>
      <span data-test-subj="panel-show-success-toast">{String(showSuccessToast)}</span>
      <span data-test-subj="panel-telemetry">{JSON.stringify(telemetry)}</span>
    </div>
  ),
}));

describe('RunCaseWorkflowModal', () => {
  const onClose = jest.fn();
  const mockExecutor: RunWorkflowExecutor = jest
    .fn()
    .mockResolvedValue({ workflowExecutionId: 'exec-1' });
  const inputs = { event: { caseId: 'case-1', owner: 'securitySolution' } };

  beforeEach(() => {
    jest.clearAllMocks();
    useGetCaseConfigurationMock.mockReturnValue(useCaseConfigureResponse);
  });

  describe('case configuration gate', () => {
    it('shows a loading state instead of the workflow list until the configuration is fetched', () => {
      useGetCaseConfigurationMock.mockReturnValue({
        ...useCaseConfigureResponse,
        isFetched: false,
      });

      render(<RunCaseWorkflowModal inputs={inputs} runWorkflow={mockExecutor} onClose={onClose} />);

      expect(screen.getByTestId('cases-run-workflow-modal-loading')).toBeInTheDocument();
      expect(screen.queryByTestId('run-workflow-panel-mock')).not.toBeInTheDocument();
    });

    it('shows an error instead of the workflow list when the configuration fails to load', () => {
      useGetCaseConfigurationMock.mockReturnValue({
        ...useCaseConfigureResponse,
        isError: true,
      });

      render(<RunCaseWorkflowModal inputs={inputs} runWorkflow={mockExecutor} onClose={onClose} />);

      expect(screen.getByTestId('cases-run-workflow-modal-error')).toBeInTheDocument();
      expect(screen.queryByTestId('run-workflow-panel-mock')).not.toBeInTheDocument();
    });
  });

  it('renders the modal with the expected title', () => {
    render(<RunCaseWorkflowModal inputs={inputs} runWorkflow={mockExecutor} onClose={onClose} />);

    expect(screen.getByText('Select workflow')).toBeInTheDocument();
  });

  it('renders the RunWorkflowPanel inside the modal', () => {
    render(<RunCaseWorkflowModal inputs={inputs} runWorkflow={mockExecutor} onClose={onClose} />);

    expect(screen.getByTestId('run-workflow-panel-mock')).toBeInTheDocument();
  });

  it('forwards the inputs prop to RunWorkflowPanel', () => {
    render(<RunCaseWorkflowModal inputs={inputs} runWorkflow={mockExecutor} onClose={onClose} />);

    expect(screen.getByTestId('panel-inputs').textContent).toBe(JSON.stringify(inputs));
  });

  it('forwards the runWorkflow executor to RunWorkflowPanel', () => {
    render(<RunCaseWorkflowModal inputs={inputs} runWorkflow={mockExecutor} onClose={onClose} />);

    expect(screen.getByTestId('panel-has-executor').textContent).toBe('yes');
  });

  it('calls onClose when the panel requests a close', () => {
    render(<RunCaseWorkflowModal inputs={inputs} runWorkflow={mockExecutor} onClose={onClose} />);

    fireEvent.click(screen.getByTestId('panel-close'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('forwards the execution-settled callback to RunWorkflowPanel', () => {
    const onExecutionSettled = jest.fn();
    render(
      <RunCaseWorkflowModal
        inputs={inputs}
        runWorkflow={mockExecutor}
        onClose={onClose}
        onExecutionSettled={onExecutionSettled}
      />
    );

    fireEvent.click(screen.getByTestId('panel-settled'));

    expect(onExecutionSettled).toHaveBeenCalledTimes(1);
  });

  it('uses the cases-run-workflow-modal test id', () => {
    render(<RunCaseWorkflowModal inputs={inputs} runWorkflow={mockExecutor} onClose={onClose} />);

    // The EuiModal renders the aria-label on the role="dialog" element.
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Select workflow');
  });

  it('always passes showSuccessToast=false to RunWorkflowPanel so Cases executors own the toast', () => {
    render(<RunCaseWorkflowModal inputs={inputs} runWorkflow={mockExecutor} onClose={onClose} />);

    expect(screen.getByTestId('panel-show-success-toast').textContent).toBe('false');
  });

  it('forwards the telemetry context to RunWorkflowPanel', () => {
    const telemetry = { origin: 'cases.case', itemCount: 1, owner: 'securitySolution' };
    render(
      <RunCaseWorkflowModal
        inputs={inputs}
        runWorkflow={mockExecutor}
        onClose={onClose}
        telemetry={telemetry}
      />
    );

    expect(screen.getByTestId('panel-telemetry').textContent).toBe(JSON.stringify(telemetry));
  });
});
