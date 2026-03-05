/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { FormProvider, useForm } from 'react-hook-form';
import { DEFAULT_FORM_STATE } from './constants';
import { NotificationPolicyForm } from './notification_policy_form';
import type { NotificationPolicyFormState } from './types';

const renderForm = (defaultValues: NotificationPolicyFormState = DEFAULT_FORM_STATE) => {
  const TestComponent = () => {
    const methods = useForm<NotificationPolicyFormState>({
      mode: 'onBlur',
      defaultValues,
    });

    return (
      <I18nProvider>
        <FormProvider {...methods}>
          <NotificationPolicyForm />
        </FormProvider>
      </I18nProvider>
    );
  };

  return render(<TestComponent />);
};

const TEST_SUBJ = {
  nameInput: 'nameInput',
  descriptionInput: 'descriptionInput',
  frequencySelect: 'frequencySelect',
  throttleIntervalInput: 'throttleIntervalInput',
} as const;

describe('NotificationPolicyForm', () => {
  it('shows required errors for name on blur', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByTestId(TEST_SUBJ.nameInput));
    await user.tab();
    expect(await screen.findByText('Name is required.')).toBeInTheDocument();
  });

  it('shows throttle interval input only when throttle frequency is selected', async () => {
    const user = userEvent.setup();
    renderForm();

    expect(screen.queryByTestId(TEST_SUBJ.throttleIntervalInput)).not.toBeInTheDocument();

    await user.selectOptions(screen.getByTestId(TEST_SUBJ.frequencySelect), 'throttle');

    expect(screen.getByTestId(TEST_SUBJ.throttleIntervalInput)).toBeInTheDocument();
  });

  it('validates throttle interval format when in throttle mode', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByTestId(TEST_SUBJ.frequencySelect), 'throttle');

    const intervalInput = screen.getByTestId(TEST_SUBJ.throttleIntervalInput);
    await user.clear(intervalInput);
    await user.type(intervalInput, '10x');
    await user.tab();

    expect(
      await screen.findByText('Invalid throttle interval. Must be in the format of 1h, 5m, 30s')
    ).toBeInTheDocument();
  });
});
