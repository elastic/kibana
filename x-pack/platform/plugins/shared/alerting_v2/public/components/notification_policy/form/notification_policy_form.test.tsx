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
import { NotificationPolicyForm } from './notification_policy_form';
import type { NotificationPolicyFormState } from './types';

jest.mock('@kbn/core-di-browser', () => {
  const { WORKFLOWS_UI_SETTING_ID } = jest.requireActual('@kbn/workflows') as {
    WORKFLOWS_UI_SETTING_ID: string;
  };
  return {
    useService: jest.fn((token: unknown) => {
      const tokenStr = String(token);
      if (tokenStr.includes('uiSettings')) {
        return {
          get: jest.fn((key: string, defaultValue?: boolean) =>
            key === WORKFLOWS_UI_SETTING_ID ? true : defaultValue
          ),
        };
      }
      if (tokenStr.includes('http')) {
        return { basePath: { prepend: (path: string) => `/mock${path}` } };
      }
      return {};
    }),
    CoreStart: jest.fn((name: string) => `CoreStart(${name})`),
  };
});

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

jest.mock('./components/quick_filters', () => ({
  QuickFilters: () => null,
}));

jest.mock('../../../hooks/use_fetch_workflows', () => ({
  useFetchWorkflows: () => ({
    data: { results: [], total: 0, page: 1, size: 100 },
    isLoading: false,
  }),
}));

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
  repeatIntervalValueInput: 'repeatIntervalValueInput',
} as const;

describe('NotificationPolicyForm', () => {
  it('shows required errors for name on blur', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByTestId(TEST_SUBJ.nameInput));
    await user.tab();
    expect(await screen.findByText('Name is required.')).toBeInTheDocument();
  });

  it('shows repeat interval controls when group throttle frequency is selected', async () => {
    const user = userEvent.setup();
    renderForm({
      ...DEFAULT_FORM_STATE,
      dispatchPer: 'group',
      groupBy: ['host.name'],
      frequency: { type: 'group_immediate' },
    });

    expect(screen.queryByTestId(TEST_SUBJ.repeatIntervalValueInput)).not.toBeInTheDocument();

    await user.selectOptions(screen.getByTestId(TEST_SUBJ.frequencySelect), 'group_throttle');

    expect(screen.getByTestId(TEST_SUBJ.repeatIntervalValueInput)).toBeInTheDocument();
  });
});
