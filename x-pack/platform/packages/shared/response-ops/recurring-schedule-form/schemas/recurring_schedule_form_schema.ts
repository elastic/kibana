/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Frequency } from '@kbn/rrule';
import { FIELD_TYPES, type FormSchema } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import {
  RECURRING_SCHEDULE_FORM_REPEAT,
  RECURRING_SCHEDULE_FORM_INTERVAL_REQUIRED,
  RECURRING_SCHEDULE_FORM_ENDS,
  RECURRING_SCHEDULE_FORM_COUNT_REQUIRED,
} from '../translations';
import type { RecurringSchedule } from '../types';
import { RecurrenceEnd } from '../constants';

const { emptyField } = fieldValidators;

export const getRecurringScheduleFormSchema = (options?: {
  allowInfiniteRecurrence?: boolean;
}): FormSchema<RecurringSchedule> => {
  const { allowInfiniteRecurrence = true } = options ?? {};
  return {
    frequency: {
      type: FIELD_TYPES.SELECT,
      label: RECURRING_SCHEDULE_FORM_REPEAT,
      defaultValue: Frequency.DAILY,
    },
    interval: {
      type: FIELD_TYPES.NUMBER,
      label: '',
      defaultValue: 1,
      validations: [
        {
          validator: emptyField(RECURRING_SCHEDULE_FORM_INTERVAL_REQUIRED),
        },
      ],
    },
    ends: {
      type: FIELD_TYPES.BUTTON_GROUP,
      label: RECURRING_SCHEDULE_FORM_ENDS,
      defaultValue: allowInfiniteRecurrence ? RecurrenceEnd.NEVER : RecurrenceEnd.ON_DATE,
      validations: [],
    },
    until: {},
    count: {
      label: '',
      type: FIELD_TYPES.TEXT,
      defaultValue: 1,
      validations: [
        {
          validator: emptyField(RECURRING_SCHEDULE_FORM_COUNT_REQUIRED),
        },
      ],
    },
    customFrequency: {
      type: FIELD_TYPES.SELECT,
      label: '',
      defaultValue: Frequency.WEEKLY,
    },
    byweekday: {},
    bymonth: { type: FIELD_TYPES.BUTTON_GROUP, label: '', validations: [], defaultValue: 'day' },
  };
};
