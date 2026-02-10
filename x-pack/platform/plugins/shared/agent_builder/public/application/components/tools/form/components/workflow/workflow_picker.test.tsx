/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import type { WorkflowToolFormData } from '../../types/tool_form_types';
import { WorkflowPicker } from './workflow_picker';

const mockWorkflows = [
  {
    id: 'workflow-1',
    name: 'Alert Triage Workflow',
    description: 'Automatically triage and enrich security alerts',
  },
  {
    id: 'workflow-2',
    name: 'Incident Response',
    description: 'Run incident response playbook',
  },
  {
    id: 'workflow-3',
    name: 'Empty Description Workflow',
    description: '',
  },
];

const mockUseListWorkflows = jest.fn();

jest.mock('../../../../../hooks/tools/use_list_workflows', () => ({
  useListWorkflows: () => mockUseListWorkflows(),
}));

const TestWrapper: React.FC<{ defaultWorkflowId?: string }> = ({ defaultWorkflowId = '' }) => {
  const form = useForm<WorkflowToolFormData>({
    defaultValues: {
      toolId: 'test-tool',
      description: '',
      labels: [],
      type: ToolType.workflow,
      workflow_id: defaultWorkflowId,
      wait_for_completion: true,
    },
    mode: 'onBlur',
  });

  return (
    <IntlProvider locale="en">
      <FormProvider {...form}>
        <WorkflowPicker />
        {/* Expose the description value for test assertions */}
        <div data-test-subj="description-value">{form.watch('description')}</div>
      </FormProvider>
    </IntlProvider>
  );
};

describe('WorkflowPicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseListWorkflows.mockReturnValue({
      data: mockWorkflows,
      isLoading: false,
    });
  });

  it('renders the workflow picker combo box', () => {
    render(<TestWrapper />);

    expect(screen.getByTestId('agentBuilderWorkflowPicker')).toBeInTheDocument();
  });

  it('auto-populates description when a workflow with a description is selected', async () => {
    render(<TestWrapper />);

    const comboBox = screen.getByTestId('agentBuilderWorkflowPicker');
    const input = comboBox.querySelector('input')!;

    await userEvent.click(input);

    const option = await screen.findByRole('option', { name: /Alert Triage Workflow/i });
    await userEvent.click(option);

    expect(screen.getByTestId('description-value')).toHaveTextContent(
      'Automatically triage and enrich security alerts'
    );
  });

  it('does not overwrite description when selected workflow has an empty description', async () => {
    render(<TestWrapper />);

    const comboBox = screen.getByTestId('agentBuilderWorkflowPicker');
    const input = comboBox.querySelector('input')!;

    await userEvent.click(input);

    const option = await screen.findByRole('option', { name: /Empty Description Workflow/i });
    await userEvent.click(option);

    // Description should remain empty since the workflow has no description
    expect(screen.getByTestId('description-value')).toHaveTextContent('');
  });

  it('shows loading state while workflows are being fetched', () => {
    mockUseListWorkflows.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<TestWrapper />);

    const comboBox = screen.getByTestId('agentBuilderWorkflowPicker');
    expect(comboBox).toBeInTheDocument();
  });

  it('clears description when the workflow selection is removed', async () => {
    render(<TestWrapper defaultWorkflowId="workflow-1" />);

    // Verify the workflow is selected
    expect(screen.getByText('Alert Triage Workflow')).toBeInTheDocument();

    // Click the clear button on the combo box
    const clearButton = screen.getByTestId('comboBoxClearButton');
    await userEvent.click(clearButton);

    // Description should be cleared
    expect(screen.getByTestId('description-value')).toHaveTextContent('');
  });

  it('displays the pre-selected workflow when defaultWorkflowId is provided', () => {
    render(<TestWrapper defaultWorkflowId="workflow-1" />);

    expect(screen.getByText('Alert Triage Workflow')).toBeInTheDocument();
  });
});
