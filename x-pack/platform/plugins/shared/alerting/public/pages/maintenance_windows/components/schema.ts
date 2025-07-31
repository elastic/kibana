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
import * as i18n from '../translations';
import type { ScopedQueryAttributes } from '../../../../common';
import { VALID_CATEGORIES } from '../constants';

const { emptyField } = fieldValidators;

export interface FormProps {
  title: string;
  startDate: string;
  endDate: string;
  timezone?: string[];
  recurring: boolean;
  recurringSchedule?: RecurringSchedule;
  solutionId?: string;
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
  solutionId: {
    type: FIELD_TYPES.SELECT,
    validations: [
      {
        validator: ({ value }: { value: string }) => {
          if (value === undefined) {
            return;
          }
          if (!VALID_CATEGORIES.includes(value)) {
            return {
              message: `Value must be one of: ${VALID_CATEGORIES.join(', ')}`,
            };
          }
        },
      },
    ],
    // The empty string appears by default because of how form libraries typically handle form inputs
    deserializer: (value) => (value === '' ? undefined : value),
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
