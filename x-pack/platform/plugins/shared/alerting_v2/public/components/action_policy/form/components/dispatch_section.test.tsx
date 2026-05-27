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

const mockUseFetchDataFields = jest.fn();

jest.mock('../../../../hooks/use_fetch_data_fields', () => ({
  useFetchDataFields: (matcher?: string) => mockUseFetchDataFields(matcher),
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
    mockUseFetchDataFields.mockReset();
    mockUseFetchDataFields.mockReturnValue({ data: undefined, isLoading: false });
  });

  it('passes the form matcher value to useFetchDataFields', () => {
    renderSection({ ...DEFAULT_FORM_STATE, matcher: 'rule.id : "r1"' });

    expect(mockUseFetchDataFields).toHaveBeenCalledWith('rule.id : "r1"');
  });

  it('populates the group-by combo-box with fields returned by useFetchDataFields', async () => {
    mockUseFetchDataFields.mockReturnValue({
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

  it('switches the default strategy to time_interval when groupingMode changes to digest', async () => {
    const user = userEvent.setup();
    renderSection();

    const toggle = screen.getByTestId(TEST_SUBJ.groupingModeToggle);
    const buttons = toggle.querySelectorAll('button');
    await user.click(buttons[2]); // Digest

    await waitFor(() =>
      expect(screen.getByTestId(TEST_SUBJ.strategySelect)).toHaveValue('time_interval')
    );
    expect(screen.getByTestId(TEST_SUBJ.throttleIntervalInput)).toHaveValue(5);
  });
});
