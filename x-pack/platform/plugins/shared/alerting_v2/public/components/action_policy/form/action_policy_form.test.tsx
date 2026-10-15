/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { FormProvider, useForm } from 'react-hook-form';
import { DEFAULT_FORM_STATE } from './constants';
import { ActionPolicyForm } from './action_policy_form';
import type { ActionPolicyFormConfig, ActionPolicyFormState } from './types';

const mockGetUrlForApp = jest.fn(
  (appId: string, { path }: { path: string }) => `/app/${appId}${path}`
);
let mockWorkflowsEnabled = true;
const mockRefetchWorkflows = jest.fn();

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'application') {
      return { getUrlForApp: mockGetUrlForApp };
    }
    if (token === 'uiSettings') {
      return { get: () => mockWorkflowsEnabled };
    }
    return {};
  },
  CoreStart: (key: string) => key,
}));

const INLINE_DEFS = [
  {
    id: 'email',
    label: 'Email',
    iconType: 'mail',
    connectorTypeId: '.email',
    paramsTemplate: 'to: ""\n',
  },
  {
    id: 'slack',
    label: 'Slack',
    iconType: 'logoSlack',
    connectorTypeId: '.slack',
    paramsTemplate: 'message: ""\n',
  },
];

jest.mock('@kbn/alerting-v2-rule-form', () => ({
  INLINE_ACTION_STEP_DEFINITIONS: INLINE_DEFS,
  getInlineActionStepDefinition: (id: string) => INLINE_DEFS.find((d) => d.id === id),
  InlineWorkflowEditor: ({
    value,
    connectorCreationConfig,
  }: {
    value: { id: string };
    connectorCreationConfig?: { mode: string; href?: string };
  }) => (
    <div
      data-test-subj={`inlineWorkflowEditor-${value.id}`}
      data-connector-creation-mode={connectorCreationConfig?.mode}
    />
  ),
  isActionValid: () => true,
  buildInlineWorkflowYaml: () => 'workflow: yaml',
}));

jest.mock('./components/matcher_input', () => ({
  MatcherInput: (props: {
    value: string;
    onChange: (v: string) => void;
    'data-test-subj'?: string;
  }) => (
    <input
      data-test-subj={props['data-test-subj']}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
    />
  ),
}));

jest.mock('../../../hooks/use_fetch_rule_event_fields', () => ({
  useFetchRuleEventFields: (_matcher?: string) => ({ data: undefined, isLoading: false }),
}));

jest.mock('../../../hooks/use_fetch_rules', () => ({
  useFetchRules: () => ({ data: { items: [], total: 0 }, isLoading: false }),
}));

jest.mock('../../../hooks/use_fetch_rule_routing_tags', () => ({
  useFetchRuleRoutingTags: () => ({ data: [], isLoading: false }),
}));

jest.mock('../../../hooks/use_fetch_workflows', () => ({
  useFetchWorkflows: () => ({
    data: { results: [], total: 0, page: 1, size: 100 },
    isLoading: false,
    refetch: mockRefetchWorkflows,
  }),
}));

const renderForm = (
  defaultValues: ActionPolicyFormState = DEFAULT_FORM_STATE,
  config?: ActionPolicyFormConfig
) => {
  const onSubmit = jest.fn();
  const TestComponent = () => {
    const methods = useForm<ActionPolicyFormState>({
      mode: 'onBlur',
      defaultValues,
    });

    return (
      <I18nProvider>
        <FormProvider {...methods}>
          <ActionPolicyForm config={config} />
          <button type="button" data-test-subj="submit" onClick={methods.handleSubmit(onSubmit)}>
            submit
          </button>
        </FormProvider>
      </I18nProvider>
    );
  };

  return { ...render(<TestComponent />), onSubmit };
};

const NAMED_FORM_STATE: ActionPolicyFormState = { ...DEFAULT_FORM_STATE, name: 'My policy' };

const VALID_FORM_STATE: ActionPolicyFormState = {
  ...NAMED_FORM_STATE,
  destinations: [{ type: 'workflow', id: 'workflow-1' }],
};

const TEST_SUBJ = {
  submit: 'submit',
  nameInput: 'nameInput',
  groupingModeToggle: 'groupingModeToggle',
  strategySelect: 'strategySelect',
  throttleIntervalInput: 'throttleIntervalInput',
  groupByInput: 'groupByInput',
} as const;

describe('ActionPolicyForm', () => {
  beforeEach(() => {
    mockWorkflowsEnabled = true;
    jest.clearAllMocks();
  });

  it('renders static sections by default', () => {
    renderForm();

    expect(screen.getByRole('heading', { name: 'Policy details' })).toBeInTheDocument();
    expect(screen.queryByTestId('actionPolicyFormSection-policyDetails')).not.toBeInTheDocument();
  });

  it('uses the flyout layout and only collapses configured sections', async () => {
    const user = userEvent.setup();
    renderForm(DEFAULT_FORM_STATE, {
      layout: 'flyout',
      connectorCreation: { mode: 'new-tab', href: '/connectors' },
      collapsibleSections: {
        notificationControls: { initialIsOpen: false },
        destination: { initialIsOpen: true },
      },
    });

    expect(screen.getByRole('heading', { name: 'Policy details' }).tagName).toBe('H3');
    expect(screen.getByRole('heading', { name: 'Policy scope' }).tagName).toBe('H3');
    expect(screen.getByTestId('actionPolicyFormSection-policyDetails')).toContainElement(
      screen.getByTestId(TEST_SUBJ.nameInput)
    );
    expect(screen.getByTestId('actionPolicyFormSection-policyScope')).toContainElement(
      screen.getByTestId('routingTagsSelector')
    );

    const notificationControlsButton = within(
      screen.getByTestId('actionPolicyFormSection-notificationControls')
    )
      .getByText('Notification controls')
      .closest('button');
    const destinationButton = within(screen.getByTestId('actionPolicyFormSection-destination'))
      .getByText('Destination')
      .closest('button');

    expect(notificationControlsButton).toHaveAttribute('aria-expanded', 'false');
    await waitFor(() => expect(destinationButton).toHaveAttribute('aria-expanded', 'true'));

    await user.click(screen.getByTestId('simpleWorkflowAdd-slack'));
    expect(await screen.findByTestId(/inlineWorkflowEditor-/)).toHaveAttribute(
      'data-connector-creation-mode',
      'new-tab'
    );
  });

  it('shows required errors for name on blur', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByTestId(TEST_SUBJ.nameInput));
    await user.tab();
    expect(await screen.findByText('Name is required.')).toBeInTheDocument();
  });

  it('shows the name error for a whitespace-only name on blur', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByTestId(TEST_SUBJ.nameInput), '   ');
    await user.tab();
    expect(await screen.findByText('Name is required.')).toBeInTheDocument();
  });

  describe('on submit', () => {
    it('blocks submit and shows the name and destination errors for an empty form', async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderForm();

      await user.click(screen.getByTestId(TEST_SUBJ.submit));

      expect(await screen.findByText('Name is required.')).toBeInTheDocument();
      expect(screen.getByText('At least one destination is required')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('submits a valid form', async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderForm(VALID_FORM_STATE);

      await user.click(screen.getByTestId(TEST_SUBJ.submit));

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    });

    it('clears the destination error once a simple workflow is added', async () => {
      const user = userEvent.setup();
      renderForm(NAMED_FORM_STATE);

      await user.click(screen.getByTestId(TEST_SUBJ.submit));
      expect(await screen.findByText('At least one destination is required')).toBeInTheDocument();

      await user.click(screen.getByTestId('simpleWorkflowAdd-email'));

      await waitFor(() =>
        expect(screen.queryByText('At least one destination is required')).not.toBeInTheDocument()
      );
    });

    it('blocks submit without destinations when workflows are disabled', async () => {
      mockWorkflowsEnabled = false;
      const user = userEvent.setup();
      const { onSubmit } = renderForm(NAMED_FORM_STATE);

      await user.click(screen.getByTestId(TEST_SUBJ.submit));

      expect(await screen.findByText('At least one destination is required')).toBeInTheDocument();
      expect(screen.getByTestId('workflowsDisabledCallout')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('submits existing destinations when workflows are disabled', async () => {
      mockWorkflowsEnabled = false;
      const user = userEvent.setup();
      const { onSubmit } = renderForm(VALID_FORM_STATE);

      await user.click(screen.getByTestId(TEST_SUBJ.submit));

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    });
  });

  it('renders grouping mode toggle with Per Alert selected by default', () => {
    renderForm();

    const toggle = screen.getByTestId(TEST_SUBJ.groupingModeToggle);
    expect(toggle).toBeInTheDocument();
    const perAlertButton = toggle.querySelector('button[aria-pressed="true"]');
    expect(perAlertButton).toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ.strategySelect)).toHaveValue('on_status_change');
  });

  it('shows strategy select for per_alert mode', () => {
    renderForm();

    const strategySelect = screen.getByTestId(TEST_SUBJ.strategySelect);
    expect(strategySelect).toBeInTheDocument();
    expect(strategySelect).toHaveValue('on_status_change');
  });

  it('shows interval input when per_status_interval strategy is selected', async () => {
    const user = userEvent.setup();
    renderForm();

    expect(screen.queryByTestId(TEST_SUBJ.throttleIntervalInput)).not.toBeInTheDocument();

    await user.selectOptions(screen.getByTestId(TEST_SUBJ.strategySelect), 'per_status_interval');

    expect(screen.getByTestId(TEST_SUBJ.throttleIntervalInput)).toBeInTheDocument();
  });

  it('shows group by and strategy when Per Group mode is selected', async () => {
    const user = userEvent.setup();
    renderForm();

    const toggle = screen.getByTestId(TEST_SUBJ.groupingModeToggle);
    const buttons = toggle.querySelectorAll('button');
    await user.click(buttons[1]); // Per Group is the second button

    expect(screen.getByTestId(TEST_SUBJ.groupByInput)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ.strategySelect)).toBeInTheDocument();
  });

  it('shows strategy select with time_interval when Digest mode is selected', async () => {
    const user = userEvent.setup();
    renderForm();

    const toggle = screen.getByTestId(TEST_SUBJ.groupingModeToggle);
    const buttons = toggle.querySelectorAll('button');
    await user.click(buttons[2]); // Digest is the third button

    const strategySelect = screen.getByTestId(TEST_SUBJ.strategySelect);
    expect(strategySelect).toBeInTheDocument();
    expect(strategySelect).toHaveValue('time_interval');
  });

  it('shows interval input when time_interval is the default strategy in digest mode', async () => {
    const user = userEvent.setup();
    renderForm();

    const toggle = screen.getByTestId(TEST_SUBJ.groupingModeToggle);
    const buttons = toggle.querySelectorAll('button');
    await user.click(buttons[2]); // Digest is the third button

    expect(screen.getByTestId(TEST_SUBJ.throttleIntervalInput)).toBeInTheDocument();
  });

  it('pre-fills interval with 5m when switching to digest mode', async () => {
    const user = userEvent.setup();
    renderForm();

    const toggle = screen.getByTestId(TEST_SUBJ.groupingModeToggle);
    const buttons = toggle.querySelectorAll('button');
    await user.click(buttons[2]); // Digest

    expect(screen.getByTestId(TEST_SUBJ.throttleIntervalInput)).toHaveValue(5);
  });

  it('pre-fills interval with 5m when selecting per_status_interval strategy', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByTestId(TEST_SUBJ.strategySelect), 'per_status_interval');

    expect(screen.getByTestId(TEST_SUBJ.throttleIntervalInput)).toHaveValue(5);
  });

  it('preserves groupBy fields when switching away from per_field and back', async () => {
    const user = userEvent.setup();
    renderForm({
      ...DEFAULT_FORM_STATE,
      groupingMode: 'per_field',
      groupBy: ['host.name', 'service.name'],
      throttleStrategy: 'time_interval',
      throttleInterval: '5m',
    });

    const toggle = screen.getByTestId(TEST_SUBJ.groupingModeToggle);
    const buttons = toggle.querySelectorAll('button');

    // Switch to Per Alert
    await user.click(buttons[0]);
    expect(screen.queryByTestId(TEST_SUBJ.groupByInput)).not.toBeInTheDocument();

    // Switch back to Per Group
    await user.click(buttons[1]);
    const groupByInput = screen.getByTestId(TEST_SUBJ.groupByInput);
    expect(groupByInput).toBeInTheDocument();

    // The previously selected groupBy values should still be present as pills
    expect(screen.getByTitle('host.name')).toBeInTheDocument();
    expect(screen.getByTitle('service.name')).toBeInTheDocument();
  });

  it('pre-fills interval with 5m on mount when strategy needs interval and interval is empty', () => {
    renderForm({
      ...DEFAULT_FORM_STATE,
      groupingMode: 'all',
      throttleStrategy: 'time_interval',
      throttleInterval: '',
    });

    expect(screen.getByTestId(TEST_SUBJ.throttleIntervalInput)).toHaveValue(5);
  });

  it('renders create workflow link when workflows are enabled', () => {
    renderForm();

    expect(screen.getByTestId('createWorkflowLink')).toBeInTheDocument();
    expect(screen.getByTestId('createWorkflowLink')).toHaveAttribute(
      'href',
      '/app/workflows/create'
    );
    expect(screen.getByTestId('createWorkflowLink')).toHaveAttribute('target', '_blank');
  });

  it('refetches workflows when the selector receives focus', () => {
    renderForm();

    fireEvent.focus(within(screen.getByTestId('destinationsInput')).getByRole('combobox'));

    expect(mockRefetchWorkflows).toHaveBeenCalled();
  });

  it('renders warning callout when workflows are disabled', () => {
    mockWorkflowsEnabled = false;
    renderForm();

    expect(screen.getByTestId('workflowsDisabledCallout')).toBeInTheDocument();
    expect(screen.getByText('Workflows are not enabled')).toBeInTheDocument();
    expect(screen.getByTestId('workflowsDisabledSettingsLink')).toBeInTheDocument();
    expect(screen.queryByTestId('destinationsInput')).not.toBeInTheDocument();
  });

  it('renders the simple workflow builder add buttons when workflows are enabled', () => {
    renderForm();

    expect(screen.getByTestId('simpleWorkflowBuilder')).toBeInTheDocument();
    expect(screen.getByTestId('simpleWorkflowAdd-email')).toBeInTheDocument();
    expect(screen.getByTestId('simpleWorkflowAdd-slack')).toBeInTheDocument();
  });

  it('hides the simple workflow builder when workflows are disabled', () => {
    mockWorkflowsEnabled = false;
    renderForm();

    expect(screen.queryByTestId('simpleWorkflowBuilder')).not.toBeInTheDocument();
  });
});
