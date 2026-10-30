/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { AutomationConfigureFlyout } from './automation_configure_flyout';

const WORKFLOW_YAML = `version: "1"
name: My automation
enabled: true
consts:
  # The AI index the KIs are written to.
  ai_index_id: "test"
  # Prefixes every KI id.
  automation_name: "my-automation"
  # The AI connector. "" uses the default model.
  connector_id: ""
  # Most units profiled in one run.
  max_units: 25
  # What each profile should say.
  instructions: |
    Lead with the numbers.
    Keep it short.
  # Numeric fields averaged per unit.
  metric_fields: ["price"]
triggers:
  - type: scheduled
    with:
      every: 1d
steps: []
`;

const mockUpdateWorkflow = jest.fn();
const mockAddSuccess = jest.fn();
const mockUseWorkflow = jest.fn();

jest.mock('@kbn/workflows-ui', () => ({
  useWorkflowsApi: () => ({ updateWorkflow: mockUpdateWorkflow }),
}));

jest.mock('../../hooks/use_workflow', () => ({
  useWorkflow: (...args: unknown[]) => mockUseWorkflow(...args),
}));

jest.mock('../../hooks/use_ai_connectors', () => ({
  useAiConnectors: () => ({
    data: [{ id: 'my-connector', name: 'My GPT', connectorTypeId: '.gen-ai' }],
    isLoading: false,
    isError: false,
  }),
}));

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({ services: { notifications: { toasts: { addSuccess: mockAddSuccess } } } }),
}));

const renderFlyout = () => {
  const onClose = jest.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nProvider>
        <EuiProvider>
          <AutomationConfigureFlyout
            workflowId="wf-1"
            workflowName="My automation"
            editHref="/app/workflows/wf-1"
            onClose={onClose}
          />
        </EuiProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
  return { onClose };
};

const parameterRow = (key: string) =>
  within(screen.getByTestId(`contextAutomationConfigureParameter-${key}`));

const savedYaml = (): string => mockUpdateWorkflow.mock.calls[0][1].yaml;

describe('AutomationConfigureFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWorkflow.mockReturnValue({
      data: {
        id: 'wf-1',
        name: 'My automation',
        enabled: true,
        tags: ['ce-template:unit_profile'],
        yaml: WORKFLOW_YAML,
      },
      isLoading: false,
      error: undefined,
    });
    mockUpdateWorkflow.mockResolvedValue({ valid: true });
  });

  it('shows every parameter with its comment, and keeps the identity ones read-only', () => {
    renderFlyout();

    expect(parameterRow('ai_index_id').getByRole('textbox')).toBeDisabled();
    expect(parameterRow('automation_name').getByRole('textbox')).toBeDisabled();
    expect(screen.getByTestId('contextAutomationConfigureParameter-ai_index_id')).toHaveTextContent(
      'The AI index the KIs are written to. Set when the automation was installed.'
    );
    expect(parameterRow('max_units').getByRole('spinbutton')).toHaveValue(25);
    expect(parameterRow('instructions').getByRole('textbox')).toHaveValue(
      'Lead with the numbers.\nKeep it short.\n'
    );
    expect(
      within(screen.getByTestId('contextAutomationConfigureSchedule')).getByRole('textbox')
    ).toHaveValue('1d');
  });

  it('saves only the edited parameters and the schedule, keeping comments and identity', async () => {
    const { onClose } = renderFlyout();

    fireEvent.change(parameterRow('max_units').getByRole('spinbutton'), {
      target: { value: '50' },
    });
    fireEvent.change(
      within(screen.getByTestId('contextAutomationConfigureSchedule')).getByRole('textbox'),
      { target: { value: '6h' } }
    );
    fireEvent.click(screen.getByTestId('contextAutomationConfigureSave'));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mockUpdateWorkflow).toHaveBeenCalledWith('wf-1', {
      name: 'My automation',
      enabled: true,
      tags: ['ce-template:unit_profile'],
      yaml: expect.any(String),
    });
    expect(savedYaml()).toContain('max_units: 50');
    expect(savedYaml()).toContain('every: 6h');
    expect(savedYaml()).toContain('# Most units profiled in one run.');
    expect(savedYaml()).toContain('ai_index_id: "test"');
    expect(mockAddSuccess).toHaveBeenCalled();
  });

  it('picks the model from the AI connectors, with the default meaning empty', async () => {
    renderFlyout();

    fireEvent.click(screen.getByTestId('contextAutomationConfigureConnector'));
    fireEvent.click(await screen.findByRole('option', { name: 'My GPT' }));
    fireEvent.click(screen.getByTestId('contextAutomationConfigureSave'));

    await waitFor(() => expect(mockUpdateWorkflow).toHaveBeenCalled());
    expect(savedYaml()).toContain('connector_id: "my-connector"');
  });

  it.each([
    ['a number that is not one', 'max_units', 'spinbutton', ''],
    ['JSON that does not parse', 'metric_fields', 'textbox', '["price"'],
  ])('does not save %s', (_label, key, role, value) => {
    renderFlyout();

    fireEvent.change(parameterRow(key).getByRole(role), { target: { value } });

    expect(screen.getByTestId('contextAutomationConfigureSave')).toBeDisabled();
  });

  it('does not save a schedule it cannot read', () => {
    renderFlyout();

    fireEvent.change(
      within(screen.getByTestId('contextAutomationConfigureSchedule')).getByRole('textbox'),
      { target: { value: 'daily' } }
    );

    expect(screen.getByTestId('contextAutomationConfigureSave')).toBeDisabled();
  });

  it('stays open and shows why when the workflow is rejected', async () => {
    mockUpdateWorkflow.mockResolvedValue({
      valid: false,
      validationErrors: ['steps.0.with.query: Required'],
    });
    const { onClose } = renderFlyout();

    fireEvent.click(screen.getByTestId('contextAutomationConfigureSave'));

    expect(await screen.findByTestId('contextAutomationConfigureSaveError')).toHaveTextContent(
      'steps.0.with.query: Required'
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});
