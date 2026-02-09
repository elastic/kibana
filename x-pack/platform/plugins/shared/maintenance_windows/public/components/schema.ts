/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormSchema } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { FIELD_TYPES } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import type { RecurringSchedule } from '@kbn/response-ops-recurring-schedule-form/types';
import { getRecurringScheduleFormSchema } from '@kbn/response-ops-recurring-schedule-form/schemas/recurring_schedule_form_schema';
import type { ScopedQueryAttributes } from '../../common';
import * as i18n from '../translations';

const { emptyField } = fieldValidators;

export interface FormProps {
  title: string;
  startDate: string;
  endDate: string;
  timezone?: string[];
  recurring: boolean;
  recurringSchedule?: RecurringSchedule;
  scopedQuery?: ScopedQueryAttributes | null;
}

export const schema: FormSchema<FormProps> = {
  title: {
    type: FIELD_TYPES.TEXT,
    label: i18n.NAME,
    validations: [
      {
        validator: emptyField(i18n.CREATE_FORM_NAME_REQUIRED),
      },
    ],
  },
  scopedQuery: {
    defaultValue: {
      kql: '',
      filters: [],
    },
  },
  startDate: {},
  endDate: {},
  timezone: {},
  recurring: {
    type: FIELD_TYPES.TOGGLE,
    label: i18n.CREATE_FORM_REPEAT,
    defaultValue: false,
  },
  recurringSchedule: getRecurringScheduleFormSchema({ allowInfiniteRecurrence: false }),
};
