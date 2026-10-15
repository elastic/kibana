/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { AiIndexAutomation } from '../../../../common/http_api/ai_indices';
import { AutomationRow } from './automation_row';

jest.mock('./workflow_yaml_preview_flyout', () => ({
  WorkflowYamlPreviewFlyout: ({
    workflowId,
    workflowName,
    onClose,
  }: {
    workflowId: string;
    workflowName: string;
    onClose: () => void;
  }) => (
    <div data-test-subj="contextWorkflowYamlPreviewFlyout">
      <span>{workflowName}</span>
      <span>{workflowId}</span>
      <button type="button" onClick={onClose}>
        Close preview
      </button>
    </div>
  ),
}));

jest.mock('./automation_delete_confirm_modal', () => ({
  AutomationDeleteConfirmModal: ({
    onCancel,
    onConfirm,
  }: {
    name: string;
    onCancel: () => void;
    onConfirm: () => Promise<boolean | void>;
  }) => (
    <div data-test-subj="contextAutomationDeleteConfirmModalStub">
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
      <button type="button" onClick={() => void onConfirm()}>
        Confirm
      </button>
    </div>
  ),
}));

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider>{ui}</EuiProvider>
    </I18nProvider>
  );

const defaultAutomation: AiIndexAutomation = {
  type: 'workflow',
  value: 'workflow-value-id',
};

const createDefaultProps = (
  overrides: Partial<React.ComponentProps<typeof AutomationRow>> = {}
): React.ComponentProps<typeof AutomationRow> => ({
  automation: defaultAutomation,
  name: 'My Workflow',
  enabled: true,
  editHref: '/app/workflows/workflow-1',
  isReadOnly: false,
  isDisabled: false,
  onDelete: jest.fn().mockResolvedValue(true),
  ...overrides,
});

const renderAutomationRow = (
  overrides: Partial<React.ComponentProps<typeof AutomationRow>> = {}
) => {
  const props = createDefaultProps(overrides);
  renderWithProviders(<AutomationRow {...props} />);
  return props;
};

const openActionsMenu = () => {
  fireEvent.click(screen.getByTestId('contextAutomationRowActionsButton'));
};

describe('AutomationRow', () => {
  it('renders the resolved workflow name when provided', () => {
    renderAutomationRow({ name: 'Resolved Workflow Name' });

    expect(screen.getByTestId('contextAiIndexAutomationRow')).toHaveTextContent(
      'Resolved Workflow Name'
    );
  });

  it('falls back to automation.value as the display name when name is undefined', () => {
    renderAutomationRow({
      name: undefined,
      automation: { type: 'workflow', value: 'fallback-workflow-id' },
    });

    expect(screen.getByTestId('contextAiIndexAutomationRow')).toHaveTextContent(
      'fallback-workflow-id'
    );
  });

  it('renders an Enabled badge when enabled is true', () => {
    renderAutomationRow({ enabled: true });

    expect(screen.getByText('Enabled')).toBeInTheDocument();
  });

  it('renders a Disabled badge when enabled is false', () => {
    renderAutomationRow({ enabled: false });

    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('renders no badge when enabled is undefined', () => {
    renderAutomationRow({ enabled: undefined });

    expect(screen.queryByText('Enabled')).not.toBeInTheDocument();
    expect(screen.queryByText('Disabled')).not.toBeInTheDocument();
  });

  it('opens the YAML preview flyout when View is chosen from the actions menu', () => {
    renderAutomationRow({ name: 'My Workflow' });

    openActionsMenu();
    fireEvent.click(screen.getByTestId('contextPreviewWorkflowButton'));

    const flyout = screen.getByTestId('contextWorkflowYamlPreviewFlyout');
    expect(flyout).toBeInTheDocument();
    expect(flyout).toHaveTextContent('My Workflow');
    expect(flyout).toHaveTextContent('workflow-value-id');
  });

  it('shows only View in the actions menu when isReadOnly is true', () => {
    renderAutomationRow({ isReadOnly: true });

    openActionsMenu();

    expect(screen.getByTestId('contextPreviewWorkflowButton')).toBeInTheDocument();
    expect(screen.queryByTestId('contextOpenWorkflowButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextRemoveAutomationButton')).not.toBeInTheDocument();
  });

  it('shows Edit and Delete in the actions menu when isReadOnly is false', () => {
    renderAutomationRow({ isReadOnly: false, editHref: '/app/workflows/edit/123' });

    openActionsMenu();

    const link = screen.getByTestId('contextOpenWorkflowButton');
    expect(link).toHaveAttribute('href', '/app/workflows/edit/123');
    expect(screen.getByTestId('contextRemoveAutomationButton')).toBeInTheDocument();
  });

  it('disables the delete menu item when isDisabled is true', () => {
    renderAutomationRow({ isDisabled: true });

    openActionsMenu();

    expect(screen.getByTestId('contextRemoveAutomationButton')).toBeDisabled();
  });

  it('opens the delete confirm modal without calling onDelete when Delete is chosen', () => {
    const { onDelete } = renderAutomationRow();

    openActionsMenu();
    fireEvent.click(screen.getByTestId('contextRemoveAutomationButton'));

    expect(screen.getByTestId('contextAutomationDeleteConfirmModalStub')).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('calls onDelete once and closes the modal when delete is confirmed', async () => {
    const { onDelete } = renderAutomationRow();

    openActionsMenu();
    fireEvent.click(screen.getByTestId('contextRemoveAutomationButton'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByTestId('contextAutomationDeleteConfirmModalStub')).not.toBeInTheDocument();
  });

  it('keeps the modal open when onDelete reports a failed save', async () => {
    renderAutomationRow({ onDelete: jest.fn().mockResolvedValue(false) });

    openActionsMenu();
    fireEvent.click(screen.getByTestId('contextRemoveAutomationButton'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(screen.getByTestId('contextAutomationDeleteConfirmModalStub')).toBeInTheDocument();
    });
  });

  it('does not call onDelete and closes the modal when delete is cancelled', () => {
    const { onDelete } = renderAutomationRow();

    openActionsMenu();
    fireEvent.click(screen.getByTestId('contextRemoveAutomationButton'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByTestId('contextAutomationDeleteConfirmModalStub')).not.toBeInTheDocument();
  });
});
