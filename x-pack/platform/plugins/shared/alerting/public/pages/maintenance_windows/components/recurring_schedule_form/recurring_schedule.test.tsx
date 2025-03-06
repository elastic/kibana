/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, PropsWithChildren } from 'react';
import { Frequency } from '@kbn/rrule';
import { fireEvent, within, screen } from '@testing-library/react';
import { useForm, Form } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { AppMockRenderer, createAppMockRenderer } from '../../../../lib/test_utils';
import { FormProps, schema } from '../schema';
import { RecurringSchedule } from './recurring_schedule';
import { EndsOptions } from '../../constants';

const initialValue: FormProps = {
  title: 'test',
  startDate: '2023-03-24',
  endDate: '2023-03-26',
  recurring: true,
  categoryIds: [],
};

describe('RecurringSchedule', () => {
  let appMockRenderer: AppMockRenderer;

  const MockHookWrapperComponent: FC<PropsWithChildren<{ iv?: FormProps }>> = ({
    children,
    iv = initialValue,
  }) => {
    const { form } = useForm<FormProps>({
      defaultValue: iv,
      options: { stripEmptyFields: false },
      schema,
    });

    return <Form form={form}>{children}</Form>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all form fields', async () => {
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.render(
      <MockHookWrapperComponent>
        <RecurringSchedule />
      </MockHookWrapperComponent>
    );

    expect(screen.getByTestId('frequency-field')).toBeInTheDocument();
    expect(screen.queryByTestId('custom-recurring-form')).not.toBeInTheDocument();
    expect(screen.getByTestId('ends-field')).toBeInTheDocument();
    expect(screen.queryByTestId('until-field')).not.toBeInTheDocument();
    expect(screen.queryByTestId('count-field')).not.toBeInTheDocument();
  });

  it('renders until field if ends = on_date', async () => {
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.render(
      <MockHookWrapperComponent>
        <RecurringSchedule />
      </MockHookWrapperComponent>
    );

    const btn = within(screen.getByTestId('ends-field')).getByTestId('recurrenceEndOptionOnDate');

    fireEvent.click(btn);
    expect(screen.getByTestId('until-field')).toBeInTheDocument();
  });

  it('renders until field if ends = after_x', async () => {
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.render(
      <MockHookWrapperComponent>
        <RecurringSchedule />
      </MockHookWrapperComponent>
    );

    const btn = within(screen.getByTestId('ends-field')).getByTestId('recurrenceEndOptionAfterX');

    fireEvent.click(btn);
    expect(screen.getByTestId('count-field')).toBeInTheDocument();
  });

  it('should initialize the form when no initialValue provided', () => {
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.render(
      <MockHookWrapperComponent>
        <RecurringSchedule />
      </MockHookWrapperComponent>
    );

    const frequencyInput = within(screen.getByTestId('frequency-field')).getByTestId(
      'recurringScheduleRepeatSelect'
    );
    const endsInput = within(screen.getByTestId('ends-field')).getByTestId(
      'recurrenceEndOptionNever'
    );

    expect(frequencyInput).toHaveValue('3');
    expect(endsInput).toHaveAttribute('aria-pressed', 'true');
  });

  it('should prefill the form when provided with initialValue', () => {
    appMockRenderer = createAppMockRenderer();
    const iv: FormProps = {
      ...initialValue,
      recurringSchedule: {
        frequency: Frequency.MONTHLY,
        ends: EndsOptions.ON_DATE,
        until: '2023-03-24',
      },
    };
    appMockRenderer.render(
      <MockHookWrapperComponent iv={iv}>
        <RecurringSchedule />
      </MockHookWrapperComponent>
    );

    const frequencyInput = within(screen.getByTestId('frequency-field')).getByTestId(
      'recurringScheduleRepeatSelect'
    );
    const endsInput = within(screen.getByTestId('ends-field')).getByTestId(
      'recurrenceEndOptionOnDate'
    );
    const untilInput = within(screen.getByTestId('until-field')).getByLabelText(
      // using the aria-label to query for the date-picker input
      'Press the down key to open a popover containing a calendar.'
    );
    expect(frequencyInput).toHaveValue('1');
    expect(endsInput).toHaveAttribute('aria-pressed', 'true');
    expect(untilInput).toHaveValue('03/24/2023');
  });
});
