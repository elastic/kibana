/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { FormProvider, useForm } from 'react-hook-form';
import { WorkflowPicker } from './workflow_picker';

const mockUseListWorkflows = jest.fn();

jest.mock('../../../../../hooks/tools/use_list_workflows', () => ({
  useListWorkflows: () => mockUseListWorkflows(),
}));

const mockWorkflows = [
  { id: 'wf-1', name: 'Workflow One', description: 'First workflow' },
  { id: 'wf-2', name: 'Workflow Two', description: 'Second workflow' },
];

interface WorkflowPickerFormValues {
  workflow_id?: string;
  configuration?: { workflow_ids?: string[] };
}

function TestWrapper({
  children,
  defaultValues,
}: {
  children: React.ReactNode;
  defaultValues: WorkflowPickerFormValues;
}) {
  const form = useForm<WorkflowPickerFormValues>({
    defaultValues,
    mode: 'onChange',
  });
  return (
    <IntlProvider locale="en">
      <FormProvider {...form}>{children}</FormProvider>
    </IntlProvider>
  );
}

describe('WorkflowPicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseListWorkflows.mockReturnValue({
      data: mockWorkflows,
      isLoading: false,
    });
  });

  it('renders with workflows', () => {
    render(
      <TestWrapper defaultValues={{ workflow_id: '' }}>
        <WorkflowPicker name="workflow_id" />
      </TestWrapper>
    );

    expect(screen.getByRole('combobox', { name: /workflow selection/i })).toBeInTheDocument();
    expect(screen.getByTestId('agentBuilderWorkflowPicker')).toBeInTheDocument();
  });

  it('shows workflow options when opened in single selection mode', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper defaultValues={{ workflow_id: '' }}>
        <WorkflowPicker name="workflow_id" />
      </TestWrapper>
    );

    const combobox = screen.getByRole('combobox', { name: /workflow selection/i });
    await user.click(combobox);

    expect(screen.getByRole('option', { name: 'Workflow One' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Workflow Two' })).toBeInTheDocument();
  });

  it('renders when workflows are loading', () => {
    mockUseListWorkflows.mockReturnValue({ data: undefined, isLoading: true });

    render(
      <TestWrapper defaultValues={{ workflow_id: '' }}>
        <WorkflowPicker name="workflow_id" />
      </TestWrapper>
    );

    expect(screen.getByRole('combobox', { name: /workflow selection/i })).toBeInTheDocument();
  });

  it('supports multi-selection when singleSelection is false', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper defaultValues={{ configuration: { workflow_ids: [] } }}>
        <WorkflowPicker name="configuration.workflow_ids" singleSelection={false} />
      </TestWrapper>
    );

    const combobox = screen.getByRole('combobox', {
      name: /pre-execution workflows selection/i,
    });
    expect(combobox).toBeInTheDocument();
    await user.click(combobox);
    expect(screen.getByRole('option', { name: 'Workflow One' })).toBeInTheDocument();
  });

  it('is disabled when isDisabled is true', () => {
    render(
      <TestWrapper defaultValues={{ workflow_id: '' }}>
        <WorkflowPicker name="workflow_id" isDisabled />
      </TestWrapper>
    );

    const combobox = screen.getByRole('combobox', { name: /workflow selection/i });
    expect(combobox).toBeDisabled();
  });
});
