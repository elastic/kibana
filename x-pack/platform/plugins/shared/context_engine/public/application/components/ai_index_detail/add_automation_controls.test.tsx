/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { WorkflowListItemDto } from '@kbn/workflows';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { AddAutomationControls } from './add_automation_controls';

interface WorkflowSelectorConfig {
  label: string;
  filterFunction: (workflows: WorkflowListItemDto[]) => WorkflowListItemDto[];
}

let mockCapturedConfig: WorkflowSelectorConfig | undefined;

jest.mock('@kbn/workflows-ui', () => ({
  WorkflowSelector: ({
    onWorkflowChange,
    config,
  }: {
    onWorkflowChange: (workflowId: string) => void;
    config: WorkflowSelectorConfig;
  }) => {
    mockCapturedConfig = config;
    return (
      <button
        type="button"
        data-test-subj="mockWorkflowSelector"
        onClick={() => onWorkflowChange('wf-picked')}
      >
        pick workflow
      </button>
    );
  },
}));

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider>{ui}</EuiProvider>
    </I18nProvider>
  );

const createWorkflowListItem = (
  overrides: Partial<WorkflowListItemDto> = {}
): WorkflowListItemDto => ({
  id: 'wf-1',
  name: 'Test Workflow',
  description: 'A workflow for testing',
  enabled: true,
  definition: {
    version: '1',
    name: 'Test Workflow',
    enabled: true,
    triggers: [],
    steps: [],
  },
  createdAt: '2024-01-01T00:00:00Z',
  valid: true,
  ...overrides,
});

const defaultProps = (
  overrides: Partial<React.ComponentProps<typeof AddAutomationControls>> = {}
) => ({
  attachedWorkflowIds: [] as string[],
  isCreating: false,
  isCreateDisabled: false,
  onAdd: jest.fn(),
  onCreate: jest.fn(),
  ...overrides,
});

const getCapturedConfig = (): WorkflowSelectorConfig => {
  if (!mockCapturedConfig) {
    throw new Error('WorkflowSelector was never rendered with a config');
  }
  return mockCapturedConfig;
};

describe('AddAutomationControls', () => {
  beforeEach(() => {
    mockCapturedConfig = undefined;
    jest.clearAllMocks();
  });

  it('calls onAdd with the picked workflow id when a workflow is selected in the selector', () => {
    const onAdd = jest.fn();
    renderWithProviders(<AddAutomationControls {...defaultProps({ onAdd })} />);

    fireEvent.click(screen.getByTestId('mockWorkflowSelector'));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith('wf-picked');
  });

  it('config.filterFunction excludes workflows whose id is already in attachedWorkflowIds', () => {
    renderWithProviders(
      <AddAutomationControls {...defaultProps({ attachedWorkflowIds: ['a'] })} />
    );

    const config = getCapturedConfig();
    expect(config.label).toBe('Select an existing workflow');

    const workflows = [
      createWorkflowListItem({ id: 'a', name: 'Workflow A' }),
      createWorkflowListItem({ id: 'b', name: 'Workflow B' }),
    ];

    const filtered = config.filterFunction(workflows);

    expect(filtered.map((workflow) => workflow.id)).toEqual(['b']);
  });

  it('config.filterFunction returns all workflows when attachedWorkflowIds is empty', () => {
    renderWithProviders(<AddAutomationControls {...defaultProps()} />);

    const workflows = [
      createWorkflowListItem({ id: 'a', name: 'Workflow A' }),
      createWorkflowListItem({ id: 'b', name: 'Workflow B' }),
    ];

    const filtered = getCapturedConfig().filterFunction(workflows);

    expect(filtered.map((workflow) => workflow.id)).toEqual(['a', 'b']);
  });

  it('calls onCreate once when the create button is clicked', () => {
    const onCreate = jest.fn();
    renderWithProviders(<AddAutomationControls {...defaultProps({ onCreate })} />);

    fireEvent.click(screen.getByTestId('contextCreateAutomationButton'));

    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('disables the create button when isCreateDisabled is true, and clicking it does not call onCreate', () => {
    const onCreate = jest.fn();
    renderWithProviders(
      <AddAutomationControls {...defaultProps({ isCreateDisabled: true, onCreate })} />
    );

    const createButton = screen.getByTestId('contextCreateAutomationButton');
    expect(createButton).toBeDisabled();

    fireEvent.click(createButton);

    expect(onCreate).not.toHaveBeenCalled();
  });

  it('blocks a second create while one is already in flight', () => {
    const onCreate = jest.fn();
    renderWithProviders(
      <AddAutomationControls {...defaultProps({ isCreating: true, onCreate })} />
    );

    const createButton = screen.getByTestId('contextCreateAutomationButton');
    expect(createButton).toBeDisabled();

    fireEvent.click(createButton);

    expect(onCreate).not.toHaveBeenCalled();
  });
});
