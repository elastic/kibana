/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { UseField, useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { RecurringScheduleForm } from '@kbn/response-ops-recurring-schedule-form/components/recurring_schedule_form';
import type { RecurringSchedule } from '@kbn/response-ops-recurring-schedule-form/types';
import type { FormProps } from './schema';

const path = 'recurringSchedule';

export const RecurringScheduleField: React.FC = React.memo(() => {
  const [{ startDate, endDate, timezone }] = useFormData<FormProps>({
    watch: ['startDate', 'endDate', 'timezone'],
  });

  return (
    <UseField<RecurringSchedule, FormProps> path={path}>
      {({ value, setValue, setErrors }) => (
        <RecurringScheduleForm
          recurringSchedule={value}
          onRecurringScheduleChange={setValue}
          onErrorsChange={(errors) => {
            setErrors(errors.map((message) => ({ path, message })));
          }}
          startDate={startDate}
          endDate={endDate}
          timezone={timezone}
        />
      )}
    </UseField>
  );
});

RecurringScheduleField.displayName = 'RecurringScheduleField';
