/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormSchema } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { FIELD_TYPES } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { Frequency } from '@kbn/rrule';
import * as i18n from '../translations';
import { EndsOptions, MaintenanceWindowFrequency } from '../constants';
import { ScopedQueryAttributes } from '../../../../common';

const { emptyField } = fieldValidators;

export interface FormProps {
  title: string;
  startDate: string;
  endDate: string;
  timezone?: string[];
  recurring: boolean;
  recurringSchedule?: RecurringScheduleFormProps;
  categoryIds?: string[];
  scopedQuery?: ScopedQueryAttributes | null;
}

export interface RecurringScheduleFormProps {
  frequency: MaintenanceWindowFrequency | 'CUSTOM';
  interval?: number;
  ends: string;
  until?: string;
  count?: number;
  customFrequency?: MaintenanceWindowFrequency;
  byweekday?: Record<string, boolean>;
  bymonth?: string;
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
  categoryIds: {
    validations: [
      {
        validator: emptyField(i18n.CREATE_FORM_CATEGORY_IDS_REQUIRED),
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
  recurringSchedule: {
    frequency: {
      type: FIELD_TYPES.SELECT,
      label: i18n.CREATE_FORM_REPEAT,
      defaultValue: Frequency.DAILY,
    },
    interval: {
      type: FIELD_TYPES.NUMBER,
      label: '',
      defaultValue: 1,
      validations: [
        {
          validator: emptyField(i18n.CREATE_FORM_INTERVAL_REQUIRED),
        },
      ],
    },
    ends: {
      type: FIELD_TYPES.BUTTON_GROUP,
      label: i18n.CREATE_FORM_ENDS,
      defaultValue: EndsOptions.NEVER,
      validations: [],
    },
    until: {},
    count: {
      label: '',
      type: FIELD_TYPES.TEXT,
      defaultValue: 1,
      validations: [
        {
          validator: emptyField(i18n.CREATE_FORM_COUNT_REQUIRED),
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
  },
};
