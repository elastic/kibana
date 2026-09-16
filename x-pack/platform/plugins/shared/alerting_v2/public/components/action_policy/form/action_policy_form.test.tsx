/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { FormProvider, useForm } from 'react-hook-form';
import { DEFAULT_FORM_STATE } from './constants';
import { ActionPolicyForm } from './action_policy_form';
import type { ActionPolicyFormState } from './types';

const mockGetUrlForApp = jest.fn(
  (appId: string, { path }: { path: string }) => `/app/${appId}${path}`
);
const mockBasePathPrepend = jest.fn((path: string) => path);
let mockWorkflowsEnabled = true;

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'application') {
      return { getUrlForApp: mockGetUrlForApp };
    }
    if (token === 'http') {
      return { basePath: { prepend: mockBasePathPrepend } };
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
  getDefaultInlineActionStepDefinition: () => INLINE_DEFS[0],
  InlineWorkflowEditor: ({ value }: { value: { id: string } }) => (
    <div data-test-subj={`inlineWorkflowEditor-${value.id}`} />
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

jest.mock('../../../hooks/use_fetch_rule_tags', () => ({
  useFetchRuleTags: () => ({
    data: ['production', 'critical', 'staging'],
    isLoading: false,
  }),
}));

jest.mock('../../../hooks/use_fetch_workflow', () => ({
  useFetchWorkflow: () => ({
    data: undefined,
    isLoading: false,
    isFetching: false,
  }),
}));

jest.mock('../../../hooks/use_fetch_workflows', () => ({
  useFetchWorkflows: () => ({
    data: {
      results: [
        {
          id: 'workflow-1',
          name: 'Slack notification workflow',
          description: 'Sends alerts to Slack',
          enabled: true,
          definition: {
            name: 'Slack notification workflow',
            enabled: true,
            triggers: [{ type: 'alert', enabled: true }],
            steps: [{ name: 'notify', type: 'slack', with: {} }],
          },
          createdAt: '2026-01-01T00:00:00.000Z',
          history: [],
          valid: true,
        },
        {
          id: 'workflow-2',
          name: 'Email digest workflow',
          description: 'Sends email digests',
          enabled: true,
          definition: {
            name: 'Email digest workflow',
            enabled: true,
            triggers: [{ type: 'scheduled', enabled: true }],
            steps: [{ name: 'email', type: 'email', with: {} }],
          },
          createdAt: '2026-01-01T00:00:00.000Z',
          history: [],
          valid: true,
        },
      ],
      total: 2,
      page: 1,
      size: 100,
    },
    isLoading: false,
  }),
}));

const renderForm = (
  defaultValues: ActionPolicyFormState = DEFAULT_FORM_STATE,
  variant: 'full' | 'essential' = 'full'
) => {
  const TestComponent = () => {
    const methods = useForm<ActionPolicyFormState>({
      mode: 'onBlur',
      defaultValues,
    });

    return (
      <I18nProvider>
        <FormProvider {...methods}>
          <ActionPolicyForm variant={variant} />
        </FormProvider>
      </I18nProvider>
    );
  };

  return render(<TestComponent />);
};

const TEST_SUBJ = {
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

  it('renders the rule tags scope field and advanced matching accordion', async () => {
    const user = userEvent.setup();
    renderForm();
    expect(screen.getByTestId('policyScopeSummary')).toBeInTheDocument();
    expect(screen.getByTestId('ruleTagsInlinePicker')).toBeInTheDocument();
    expect(screen.getByTestId('advancedMatchingAccordion')).toBeInTheDocument();

    await user.click(screen.getByTestId('advancedMatchingAccordion'));
    expect(screen.getByTestId('matcherInput')).toBeInTheDocument();
  });

  it('shows required errors for name on blur', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByTestId(TEST_SUBJ.nameInput));
    await user.tab();
    expect(await screen.findByText('Name is required.')).toBeInTheDocument();
  });

  it('renders grouping mode toggle with Per alert selected by default', () => {
    renderForm();

    const toggle = screen.getByTestId(TEST_SUBJ.groupingModeToggle);
    expect(toggle).toBeInTheDocument();
    const selectedButton = toggle.querySelector('button[aria-pressed="true"]');
    expect(selectedButton).toHaveTextContent('Per alert');
    expect(screen.getByTestId(TEST_SUBJ.strategySelect)).toHaveValue('on_status_change');
  });

  it('shows frequency select for per_episode mode', () => {
    renderForm();

    expect(screen.getByTestId(TEST_SUBJ.strategySelect)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ.strategySelect)).toHaveValue('on_status_change');
  });

  it('shows interval input when per_status_interval strategy is selected', async () => {
    const user = userEvent.setup();
    renderForm();

    expect(screen.queryByTestId(TEST_SUBJ.throttleIntervalInput)).not.toBeInTheDocument();

    await user.selectOptions(screen.getByTestId(TEST_SUBJ.strategySelect), 'per_status_interval');

    expect(screen.getByTestId(TEST_SUBJ.throttleIntervalInput)).toBeInTheDocument();
  });

  it('shows group by and strategy when Combined mode is selected with Group by field', async () => {
    const user = userEvent.setup();
    renderForm();

    const toggle = screen.getByTestId(TEST_SUBJ.groupingModeToggle);
    const buttons = toggle.querySelectorAll('button');
    await user.click(buttons[1]); // Combined
    await user.click(screen.getByTestId('groupByFieldSwitch'));

    expect(screen.getByTestId(TEST_SUBJ.groupByInput)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ.strategySelect)).toBeInTheDocument();
  });

  it('shows strategy select with time_interval when Combined mode is selected', async () => {
    const user = userEvent.setup();
    renderForm();

    const toggle = screen.getByTestId(TEST_SUBJ.groupingModeToggle);
    const buttons = toggle.querySelectorAll('button');
    await user.click(buttons[1]); // Combined

    const strategySelect = screen.getByTestId(TEST_SUBJ.strategySelect);
    expect(strategySelect).toBeInTheDocument();
    expect(strategySelect).toHaveValue('time_interval');
  });

  it('pre-fills interval with 5m when switching to Combined mode', async () => {
    const user = userEvent.setup();
    renderForm();

    const toggle = screen.getByTestId(TEST_SUBJ.groupingModeToggle);
    const buttons = toggle.querySelectorAll('button');
    await user.click(buttons[1]); // Combined

    expect(screen.getByTestId(TEST_SUBJ.throttleIntervalInput)).toHaveValue(5);
  });

  it('pre-fills interval with 5m when selecting per_status_interval strategy', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByTestId(TEST_SUBJ.strategySelect), 'per_status_interval');

    expect(screen.getByTestId(TEST_SUBJ.throttleIntervalInput)).toHaveValue(5);
  });

  it('marks Combined selected when groupingMode is per_field', () => {
    renderForm({
      ...DEFAULT_FORM_STATE,
      groupingMode: 'per_field',
      groupBy: ['host.name', 'service.name'],
      throttleStrategy: 'time_interval',
      throttleInterval: '5m',
    });

    const toggle = screen.getByTestId(TEST_SUBJ.groupingModeToggle);
    const selectedButton = toggle.querySelector('button[aria-pressed="true"]');
    expect(selectedButton).toHaveTextContent('Combined');
    expect(screen.getByTestId('groupByFieldSwitch')).toBeChecked();
    expect(screen.getByTestId(TEST_SUBJ.groupByInput)).toBeInTheDocument();
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

  it('renders enriched workflow options with name and description', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByTestId('destinationsInput'));
    expect(await screen.findByTestId('workflowOption-workflow-1')).toBeInTheDocument();
    expect(screen.getByText('Slack notification workflow')).toBeInTheDocument();
    expect(screen.getByText('Sends alerts to Slack')).toBeInTheDocument();
    expect(screen.getByTestId('createDestinationButton')).toBeInTheDocument();
  });

  it('renders essential variant with name, rule tags, and workflows', () => {
    renderForm(
      {
        ...DEFAULT_FORM_STATE,
        matcher: 'rule.tags : "production"',
      },
      'essential'
    );
    expect(screen.getByTestId('nameInput')).toBeInTheDocument();
    expect(screen.getByTestId('essentialRuleTagsInput')).toBeInTheDocument();
    expect(screen.queryByTestId('descriptionInput')).not.toBeInTheDocument();
    expect(screen.queryByTestId('groupingModeToggle')).not.toBeInTheDocument();
    expect(screen.getByTestId('createDestinationButton')).toBeInTheDocument();
  });

  it('renders warning callout when workflows are disabled', () => {
    mockWorkflowsEnabled = false;
    renderForm();

    expect(screen.getByTestId('workflowsDisabledCallout')).toBeInTheDocument();
    expect(screen.getByText('Workflows are not enabled')).toBeInTheDocument();
    expect(screen.getByTestId('workflowsDisabledSettingsLink')).toBeInTheDocument();
    expect(screen.queryByTestId('destinationsInput')).not.toBeInTheDocument();
  });

  it('keeps classic notification controls for With tags and shows the chart for Notification controls', async () => {
    const user = userEvent.setup();
    renderForm();

    expect(screen.getByTestId('ruleTagsPrototypeSettings')).toBeInTheDocument();
    expect(screen.getByTestId('dispatchConfigCallout')).toBeInTheDocument();
    expect(screen.getByTestId('dispatchConfigModeHelp')).toHaveTextContent(
      'Per alert. Best when you need visibility into each alert separately.'
    );
    expect(screen.getByTestId('dispatchOptionDiagram')).toBeInTheDocument();

    await user.click(screen.getByTestId('ruleTagsPrototypeToggle-notification_controls'));

    expect(screen.getByTestId('dispatchOptionDiagram')).toBeInTheDocument();
    expect(screen.getByTestId('dispatchConfigCallout')).toBeInTheDocument();
    expect(screen.getByTestId('dispatchConfigModeHelp')).toBeInTheDocument();

    await user.click(screen.getByTestId('ruleTagsPrototypeToggle-with_tags'));

    expect(screen.getByTestId('dispatchOptionDiagram')).toBeInTheDocument();
    expect(screen.getByTestId('dispatchConfigCallout')).toBeInTheDocument();
  });
});
