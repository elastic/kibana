/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FIELD_TYPES } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { getRecurringScheduleFormSchema } from '@kbn/response-ops-recurring-schedule-form/schemas/recurring_schedule_form_schema';
import type { ActionsPublicPluginSetup } from '@kbn/actions-plugin/public';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { ReportTypeData, ReportTypeId } from '../../types';
import { getEmailsValidator } from '../validators/emails_validator';
import * as i18n from '../translations';

const { emptyField } = fieldValidators;

export const getScheduledReportFormSchema = (
  validateEmailAddresses: ActionsPublicPluginSetup['validateEmailAddresses'],
  availableReportTypes?: ReportTypeData[]
) => ({
  title: {
    type: FIELD_TYPES.TEXT,
    label: i18n.SCHEDULED_REPORT_FORM_FILE_NAME_LABEL,
    validations: [
      {
        validator: emptyField(i18n.SCHEDULED_REPORT_FORM_FILE_NAME_REQUIRED_MESSAGE),
      },
    ],
  },
  reportTypeId: {
    type: FIELD_TYPES.SUPER_SELECT,
    label: i18n.SCHEDULED_REPORT_FORM_FILE_TYPE_LABEL,
    defaultValue: (availableReportTypes?.[0]?.id as ReportTypeId) ?? '',
    validations: [
      {
        validator: emptyField(i18n.SCHEDULED_REPORT_FORM_FILE_TYPE_REQUIRED_MESSAGE),
      },
    ],
  },
  startDate: {},
  timezone: {},
  recurringSchedule: getRecurringScheduleFormSchema({ allowInfiniteRecurrence: false }),
  sendByEmail: {
    type: FIELD_TYPES.TOGGLE,
    label: i18n.SCHEDULED_REPORT_FORM_SEND_BY_EMAIL_LABEL,
    defaultValue: false,
  },
  emailRecipients: {
    type: FIELD_TYPES.COMBO_BOX,
    label: i18n.SCHEDULED_REPORT_FORM_EMAIL_RECIPIENTS_LABEL,
    defaultValue: [],
    validations: [
      {
        validator: emptyField(i18n.SCHEDULED_REPORT_FORM_EMAIL_RECIPIENTS_REQUIRED_MESSAGE),
      },
      {
        isBlocking: false,
        validator: getEmailsValidator(validateEmailAddresses),
      },
    ],
  },
});
