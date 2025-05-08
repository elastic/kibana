/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PropsWithChildren } from 'react';
import { screen, render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Frequency } from '@kbn/rrule';
import { Form, useForm, useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { RecurringSchedule } from '@kbn/response-ops-recurring-schedule-form/types';
import { RecurringScheduleField } from './recurring_schedule_field';
import type { FormProps } from './schema';
import { schema } from './schema';
import { RecurrenceEnd } from '@kbn/response-ops-recurring-schedule-form/constants';

const baseValue = {
  title: 'Test',
  startDate: '2025-01-01',
  endDate: '2025-01-02',
  recurring: true,
};

const TestWrapper = ({
  defaultValue = {
    ...baseValue,
    recurringSchedule: {
      frequency: Frequency.YEARLY,
      ends: RecurrenceEnd.ON_DATE,
    },
  },
  onFormDataChange,
  children,
}: PropsWithChildren<{
  defaultValue?: FormProps;
  onFormDataChange?: (data: FormProps) => void;
}>) => {
  const { form } = useForm<FormProps>({
    defaultValue,
    options: { stripEmptyFields: false },
    schema,
  });

  useFormData<FormProps>({
    form,
    onChange: onFormDataChange,
  });

  return <Form form={form}>{children}</Form>;
};

describe('RecurringScheduleField', () => {
  it('should forward the recurringSchedule to RecurringScheduleForm', () => {
    const recurringSchedule: RecurringSchedule = {
      frequency: Frequency.YEARLY,
      ends: '',
    };
    render(
      <TestWrapper
        defaultValue={{
          ...baseValue,
          recurringSchedule,
        }}
      >
        <RecurringScheduleField />
      </TestWrapper>
    );

    expect(
      within(screen.getByTestId('frequency-field')).getByTestId('recurringScheduleRepeatSelect')
    ).toHaveValue(Frequency.YEARLY.toString());
    expect(
      within(screen.getByTestId('ends-field')).getByTestId('recurrenceEndOptionNever')
    ).toBeInTheDocument();
  });

  it('should hook recurringSchedule changes to the corresponding maintenance window form field', async () => {
    let formData: FormProps | undefined;

    render(
      // While not the most elegant or aligned with react-testing-library's user-focused philosophy,
      // this approach reliably verifies that the form field updates correctly
      <TestWrapper onFormDataChange={(newFormData) => (formData = newFormData)}>
        <RecurringScheduleField />
      </TestWrapper>
    );

    expect(formData?.recurringSchedule?.ends).toEqual(RecurrenceEnd.ON_DATE);

    await userEvent.click(
      within(screen.getByTestId('ends-field')).getByTestId('recurrenceEndOptionNever')
    );

    expect(formData?.recurringSchedule?.ends).toEqual(RecurrenceEnd.NEVER);
  });
});
