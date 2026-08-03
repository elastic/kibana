/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { AiIndexAutomation } from '../../../../common/http_api/ai_indices';
import { AutomationRow } from './automation_row';

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
  isEditing: true,
  isRemoveDisabled: false,
  onRemove: jest.fn(),
  ...overrides,
});

const renderAutomationRow = (
  overrides: Partial<React.ComponentProps<typeof AutomationRow>> = {}
) => {
  const props = createDefaultProps(overrides);
  renderWithProviders(<AutomationRow {...props} />);
  return props;
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

  it('renders the Edit workflow link with the given editHref for in-app navigation', () => {
    renderAutomationRow({ editHref: '/app/workflows/edit/123' });

    const link = screen.getByTestId('contextOpenWorkflowButton');
    expect(link).toHaveAttribute('href', '/app/workflows/edit/123');
    expect(link).not.toHaveAttribute('target');
  });

  it('renders no actions when isEditing is false', () => {
    renderAutomationRow({ isEditing: false });

    expect(screen.queryByTestId('contextOpenWorkflowButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextRemoveAutomationButton')).not.toBeInTheDocument();
  });

  it('renders the actions when isEditing is true', () => {
    renderAutomationRow({ isEditing: true });

    expect(screen.getByTestId('contextOpenWorkflowButton')).toBeInTheDocument();
    expect(screen.getByTestId('contextRemoveAutomationButton')).toBeInTheDocument();
  });

  it('calls onRemove exactly once when the remove button is clicked', () => {
    const { onRemove } = renderAutomationRow({ isEditing: true });

    fireEvent.click(screen.getByTestId('contextRemoveAutomationButton'));

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('disables the remove button when isRemoveDisabled is true', () => {
    renderAutomationRow({ isEditing: true, isRemoveDisabled: true });

    expect(screen.getByTestId('contextRemoveAutomationButton')).toBeDisabled();
  });

  it('does not call onRemove when clicking the disabled remove button', () => {
    const { onRemove } = renderAutomationRow({ isEditing: true, isRemoveDisabled: true });

    fireEvent.click(screen.getByTestId('contextRemoveAutomationButton'));

    expect(onRemove).not.toHaveBeenCalled();
  });

  it("includes the display name in the remove button's accessible label", () => {
    renderAutomationRow({ name: 'My Workflow', isEditing: true });

    expect(
      screen.getByRole('button', { name: 'Remove automation My Workflow' })
    ).toBeInTheDocument();
  });
});
