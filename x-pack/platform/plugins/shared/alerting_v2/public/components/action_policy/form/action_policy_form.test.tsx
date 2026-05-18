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
let mockWorkflowsEnabled = true;

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

jest.mock('../../../hooks/use_fetch_data_fields', () => ({
  useFetchDataFields: (_matcher?: string) => ({ data: undefined, isLoading: false }),
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
    data: { results: [], total: 0, page: 1, size: 100 },
    isLoading: false,
  }),
}));

const renderForm = (defaultValues: ActionPolicyFormState = DEFAULT_FORM_STATE) => {
  const TestComponent = () => {
    const methods = useForm<ActionPolicyFormState>({
      mode: 'onBlur',
      defaultValues,
    });

    return (
      <I18nProvider>
        <FormProvider {...methods}>
          <ActionPolicyForm />
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

  it('renders tags input', () => {
    renderForm();
    expect(screen.getByTestId('tagsInput')).toBeInTheDocument();
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

  it('renders create workflow link when workflows are enabled', () => {
    renderForm();

    expect(screen.getByTestId('createWorkflowLink')).toBeInTheDocument();
    expect(screen.getByTestId('createWorkflowLink')).toHaveAttribute(
      'href',
      '/app/workflows/create'
    );
    expect(screen.getByTestId('createWorkflowLink')).toHaveAttribute('target', '_blank');
  });

  it('renders warning callout when workflows are disabled', () => {
    mockWorkflowsEnabled = false;
    renderForm();

    expect(screen.getByTestId('workflowsDisabledCallout')).toBeInTheDocument();
    expect(screen.getByText('Workflows are not enabled')).toBeInTheDocument();
    expect(screen.getByTestId('workflowsDisabledSettingsLink')).toBeInTheDocument();
    expect(screen.queryByTestId('destinationsInput')).not.toBeInTheDocument();
  });
});
