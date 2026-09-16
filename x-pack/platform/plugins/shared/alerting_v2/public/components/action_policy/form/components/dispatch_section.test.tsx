/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { FormProvider, useForm } from 'react-hook-form';
import { DEFAULT_FORM_STATE } from '../constants';
import { DispatchSection } from './dispatch_section';
import type { ActionPolicyFormState } from '../types';

const mockUseFetchRuleEventFields = jest.fn();

jest.mock('../../../../hooks/use_fetch_rule_event_fields', () => ({
  useFetchRuleEventFields: (matcher?: string) => mockUseFetchRuleEventFields(matcher),
}));

const renderSection = (defaultValues: ActionPolicyFormState = DEFAULT_FORM_STATE) => {
  const TestComponent = () => {
    const methods = useForm<ActionPolicyFormState>({
      mode: 'onBlur',
      defaultValues,
    });

    return (
      <I18nProvider>
        <FormProvider {...methods}>
          <DispatchSection />
        </FormProvider>
      </I18nProvider>
    );
  };

  return render(<TestComponent />);
};

const TEST_SUBJ = {
  groupingModeToggle: 'groupingModeToggle',
  strategySelect: 'strategySelect',
  throttleIntervalInput: 'throttleIntervalInput',
  groupByInput: 'groupByInput',
} as const;

describe('DispatchSection', () => {
  beforeEach(() => {
    mockUseFetchRuleEventFields.mockReset();
    mockUseFetchRuleEventFields.mockReturnValue({ data: undefined, isLoading: false });
  });

  it('passes the form matcher value to useFetchRuleEventFields', () => {
    renderSection({ ...DEFAULT_FORM_STATE, matcher: 'rule.id : "r1"' });

    expect(mockUseFetchRuleEventFields).toHaveBeenCalledWith('rule.id : "r1"');
  });

  it('populates the group-by combo-box with fields returned by useFetchRuleEventFields', async () => {
    mockUseFetchRuleEventFields.mockReturnValue({
      data: ['data.host', 'data.service'],
      isLoading: false,
    });
    const user = userEvent.setup();
    renderSection({ ...DEFAULT_FORM_STATE, groupingMode: 'per_field' });

    const groupByInput = screen.getByTestId(TEST_SUBJ.groupByInput);
    await user.click(groupByInput.querySelector('input')!);

    expect(await screen.findByTitle('data.host')).toBeInTheDocument();
    expect(screen.getByTitle('data.service')).toBeInTheDocument();
  });

  it('does not render group-by combo-box outside per_field mode', () => {
    renderSection({ ...DEFAULT_FORM_STATE, groupingMode: 'per_episode' });

    expect(screen.queryByTestId(TEST_SUBJ.groupByInput)).not.toBeInTheDocument();
  });

  it('renders group-by combo-box when groupingMode is per_field', () => {
    renderSection({ ...DEFAULT_FORM_STATE, groupingMode: 'per_field' });

    expect(screen.getByTestId(TEST_SUBJ.groupByInput)).toBeInTheDocument();
  });

  it('renders the interval input only when the strategy needs an interval', async () => {
    const user = userEvent.setup();
    renderSection();

    expect(screen.queryByTestId(TEST_SUBJ.throttleIntervalInput)).not.toBeInTheDocument();

    await user.selectOptions(screen.getByTestId(TEST_SUBJ.strategySelect), 'per_status_interval');

    expect(await screen.findByTestId(TEST_SUBJ.throttleIntervalInput)).toBeInTheDocument();
  });

  it('switches the default strategy to time_interval when Combined mode is selected', async () => {
    const user = userEvent.setup();
    renderSection();

    const toggle = screen.getByTestId(TEST_SUBJ.groupingModeToggle);
    const buttons = toggle.querySelectorAll('button');
    await user.click(buttons[1]); // Combined

    await waitFor(() =>
      expect(screen.getByTestId(TEST_SUBJ.strategySelect)).toHaveValue('time_interval')
    );
    expect(screen.getByTestId(TEST_SUBJ.throttleIntervalInput)).toHaveValue(5);
    expect(screen.getByTestId('groupByFieldSwitch')).toBeInTheDocument();
    expect(screen.queryByTestId(TEST_SUBJ.groupByInput)).not.toBeInTheDocument();
  });

  it('shows group-by fields when Group by field switch is enabled', async () => {
    const user = userEvent.setup();
    renderSection();

    const toggle = screen.getByTestId(TEST_SUBJ.groupingModeToggle);
    await user.click(toggle.querySelectorAll('button')[1]); // Combined
    await user.click(screen.getByTestId('groupByFieldSwitch'));

    expect(screen.getByTestId(TEST_SUBJ.groupByInput)).toBeInTheDocument();
  });

  it('nests frequency controls inside Per alert options when Per alert is selected', () => {
    renderSection();

    const panel = screen.getByTestId('perAlertOptions');
    expect(panel.querySelector('[data-test-subj="strategySelect"]')).toBeInTheDocument();
    expect(screen.queryByText('How often?')).not.toBeInTheDocument();
    expect(screen.queryByText('Per alert options')).not.toBeInTheDocument();
    expect(screen.queryByTestId('combinedOptions')).not.toBeInTheDocument();
  });

  it('nests frequency controls inside Combined options when Combined is selected', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByTestId(TEST_SUBJ.groupingModeToggle).querySelectorAll('button')[1]);

    const panel = screen.getByTestId('combinedOptions');
    expect(panel.querySelector('[data-test-subj="strategySelect"]')).toBeInTheDocument();
    expect(screen.queryByText('How often?')).not.toBeInTheDocument();
    expect(screen.queryByText('Combined options')).not.toBeInTheDocument();
    expect(screen.queryByTestId('perAlertOptions')).not.toBeInTheDocument();
  });

  it('shows all frequency option explanations in a help popover next to Frequency', async () => {
    const user = userEvent.setup();
    renderSection();

    const selectedHelp =
      'Notifies once when an episode opens and once when it recovers. No repeat notifications while it remains active.';

    expect(screen.queryByText(selectedHelp)).not.toBeInTheDocument();

    await user.hover(screen.getByTestId('frequencyOptionsHelpButton'));

    expect(await screen.findByTestId('frequencyOptionsHelpPanel')).toBeInTheDocument();
    expect(screen.getByText(selectedHelp)).toBeInTheDocument();
    expect(
      screen.getByText(/Notifies on status change, then resends at a regular interval/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Sends a notification on every rule evaluation per episode/)
    ).toBeInTheDocument();
  });
});
