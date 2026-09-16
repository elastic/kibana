/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
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
  useFetchRuleTags: () => ({ data: [], isLoading: false }),
}));

jest.mock('../../../hooks/use_fetch_tags', () => ({
  useFetchTags: () => ({ data: [], isLoading: false }),
}));

jest.mock('../../../hooks/use_fetch_workflows', () => ({
  useFetchWorkflows: () => ({
    data: {
      results: [
        {
          id: 'wf-1',
          name: 'Test Workflow',
          description: '',
          enabled: true,
          definition: null,
          createdAt: '',
          history: [],
          valid: true,
        },
      ],
      total: 1,
      page: 1,
      size: 100,
    },
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

  it('renders name and description inputs', () => {
    renderForm();
    expect(screen.getByTestId('nameInput')).toBeInTheDocument();
    expect(screen.getByTestId('descriptionInput')).toBeInTheDocument();
  });

  it('renders policy scope with rule tags, live summary, and collapsed advanced matching', () => {
    renderForm();

    expect(screen.getByTestId('policyScopeSummary')).toHaveTextContent(
      'Applies to all episodes in the space.'
    );
    expect(screen.getByTestId('essentialRuleTagsInput')).toBeInTheDocument();
    const advancedMatching = screen.getByTestId('policyScopeAdvancedMatching');
    expect(advancedMatching).toBeInTheDocument();
    expect(within(advancedMatching).getByRole('button')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('quickFilterTags')).not.toBeInTheDocument();
  });

  it('updates the policy scope summary when rule tags are selected', async () => {
    const user = userEvent.setup();
    renderForm();

    const tagsCombo = screen.getByTestId('essentialRuleTagsInput');
    const comboInput = within(tagsCombo).getByRole('combobox');
    await user.click(comboInput);
    await user.type(comboInput, 'production');
    await user.keyboard('{Enter}');

    expect(screen.getByTestId('policyScopeSummary')).toHaveTextContent(
      'Applies to alerts from rules with any of these tags: production.'
    );
  });

  it('opens Advanced matching with the KQL matcher when advanced conditions exist', () => {
    renderForm({
      ...DEFAULT_FORM_STATE,
      matcher: 'data.severity : "critical"',
    });

    expect(screen.getByTestId('policyScopeSummary')).toHaveTextContent(
      'Applies to episodes that match the advanced conditions.'
    );
    const advancedMatching = screen.getByTestId('policyScopeAdvancedMatching');
    expect(within(advancedMatching).getByRole('button')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('matcherInput')).toHaveValue('data.severity : "critical"');
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
    expect(screen.queryByTestId('essentialActionPolicyDefaultsCallout')).not.toBeInTheDocument();
    expect(screen.queryByTestId('descriptionInput')).not.toBeInTheDocument();
    expect(screen.queryByTestId('matcherInput')).not.toBeInTheDocument();
    expect(screen.queryByTestId('groupingModeToggle')).not.toBeInTheDocument();
    expect(screen.getByTestId('createDestinationButton')).toBeInTheDocument();
  });

  it('shows required errors for name on blur', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByTestId(TEST_SUBJ.nameInput));
    await user.tab();
    expect(await screen.findByText('Name is required.')).toBeInTheDocument();
  });

  it('renders grouping mode toggle with Per Episode selected by default', () => {
    renderForm();

    const toggle = screen.getByTestId(TEST_SUBJ.groupingModeToggle);
    expect(toggle).toBeInTheDocument();
    const perEpisodeButton = toggle.querySelector('button[aria-pressed="true"]');
    expect(perEpisodeButton).toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ.strategySelect)).toHaveValue('on_status_change');
  });

  it('shows strategy select for per_episode mode', () => {
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

    // Switch to Per Episode
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

  it('offers create destination button and create-workflow option in Destinations combo', async () => {
    const user = userEvent.setup();
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

    renderForm();

    expect(screen.getByTestId('createDestinationButton')).toBeInTheDocument();
    expect(screen.queryByTestId('createDestinationMenuButton')).not.toBeInTheDocument();

    const destinationsCombo = screen.getByTestId('destinationsInput');
    await user.click(within(destinationsCombo).getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Create a workflow' }));

    expect(openSpy).toHaveBeenCalledWith(
      '/app/workflows/create',
      '_blank',
      'noopener,noreferrer'
    );
    openSpy.mockRestore();
  });

  it('creates an email notification draft from the create destination button', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByTestId('createDestinationButton'));

    expect(await screen.findByTestId(/inlineWorkflowEditor-/)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Email notification')).toBeInTheDocument();
  });

  it('renders warning callout when workflows are disabled', () => {
    mockWorkflowsEnabled = false;
    renderForm();

    expect(screen.getByTestId('workflowsDisabledCallout')).toBeInTheDocument();
    expect(screen.getByText('Workflows are not enabled')).toBeInTheDocument();
    expect(screen.getByTestId('workflowsDisabledSettingsLink')).toBeInTheDocument();
    expect(screen.queryByTestId('destinationsInput')).not.toBeInTheDocument();
  });

  it('renders destination create entry points when workflows are enabled', () => {
    renderForm();

    expect(screen.getByTestId('createDestinationButton')).toBeInTheDocument();
    expect(screen.queryByTestId('destinationCards')).not.toBeInTheDocument();
  });

  it('hides destination create entry points when workflows are disabled', () => {
    mockWorkflowsEnabled = false;
    renderForm();

    expect(screen.queryByTestId('createDestinationButton')).not.toBeInTheDocument();
  });
});
