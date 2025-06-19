/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SCHEDULED_REPORT_FLYOUT_TITLE = i18n.translate(
  'xpack.reporting.scheduledReportingFlyout.title',
  {
    defaultMessage: 'Schedule exports',
  }
);

export const SCHEDULED_REPORT_FLYOUT_SUBMIT_BUTTON_LABEL = i18n.translate(
  'xpack.reporting.scheduledReportingFlyout.submitButtonLabel',
  {
    defaultMessage: 'Schedule exports',
  }
);

export const SCHEDULED_REPORT_FLYOUT_CANCEL_BUTTON_LABEL = i18n.translate(
  'xpack.reporting.scheduledReportingFlyout.cancelButtonLabel',
  {
    defaultMessage: 'Cancel',
  }
);

export const SCHEDULED_REPORT_FORM_FILE_NAME_LABEL = i18n.translate(
  'xpack.reporting.scheduledReportingForm.fileNameLabel',
  {
    defaultMessage: 'Report name',
  }
);

export const SCHEDULED_REPORT_FORM_FILE_NAME_REQUIRED_MESSAGE = i18n.translate(
  'xpack.reporting.scheduledReportingForm.fileNameRequiredMessage',
  {
    defaultMessage: 'Report file name is required',
  }
);

export const SCHEDULED_REPORT_FORM_FILE_TYPE_LABEL = i18n.translate(
  'xpack.reporting.scheduledReportingForm.fileTypeLabel',
  {
    defaultMessage: 'File type',
  }
);
export const SCHEDULED_REPORT_FORM_FILE_TYPE_REQUIRED_MESSAGE = i18n.translate(
  'xpack.reporting.scheduledReportingForm.fileTypeRequiredMessage',
  {
    defaultMessage: 'File type is required',
  }
);

export const SCHEDULED_REPORT_FORM_START_DATE_LABEL = i18n.translate(
  'xpack.reporting.scheduledReportingForm.startDateLabel',
  {
    defaultMessage: 'Date',
  }
);

export const SCHEDULED_REPORT_FORM_START_DATE_REQUIRED_MESSAGE = i18n.translate(
  'xpack.reporting.scheduledReportingForm.startDateRequiredMessage',
  {
    defaultMessage: 'Date is required',
  }
);

export const SCHEDULED_REPORT_FORM_START_DATE_TOO_EARLY_MESSAGE = i18n.translate(
  'xpack.reporting.scheduledReportingForm.startDateTooEarlyMessage',
  {
    defaultMessage: 'Start date must be in the future',
  }
);

export const SCHEDULED_REPORT_FORM_TIMEZONE_LABEL = i18n.translate(
  'xpack.reporting.scheduledReportingForm.timezoneLabel',
  {
    defaultMessage: 'Timezone',
  }
);
export const SCHEDULED_REPORT_FORM_TIMEZONE_REQUIRED_MESSAGE = i18n.translate(
  'xpack.reporting.scheduledReportingForm.timezoneRequiredMessage',
  {
    defaultMessage: 'Timezone is required',
  }
);

export const SCHEDULED_REPORT_FORM_FILE_NAME_SUFFIX = i18n.translate(
  'xpack.reporting.scheduledReportingForm.fileNameSuffix',
  {
    defaultMessage: '+ @timestamp',
  }
);

export const SCHEDULED_REPORT_FORM_DETAILS_SECTION_TITLE = i18n.translate(
  'xpack.reporting.scheduledReportingForm.detailsSectionTitle',
  {
    defaultMessage: 'Details',
  }
);

export const SCHEDULED_REPORT_FORM_SCHEDULE_SECTION_TITLE = i18n.translate(
  'xpack.reporting.scheduledReportingForm.scheduleSectionTitle',
  {
    defaultMessage: 'Schedule',
  }
);

export const SCHEDULED_REPORT_FORM_EXPORTS_SECTION_TITLE = i18n.translate(
  'xpack.reporting.scheduledReportingForm.exportsSectionTitle',
  {
    defaultMessage: 'Exports',
  }
);

export const SCHEDULED_REPORT_FORM_EXPORTS_SECTION_DESCRIPTION = i18n.translate(
  'xpack.reporting.scheduledReportingForm.exportsSectionDescription',
  {
    defaultMessage:
      "On the scheduled date we'll create a snapshot and list it in Stack Management > Reporting for download",
  }
);

export const SCHEDULED_REPORT_FORM_RECURRING_LABEL = i18n.translate(
  'xpack.reporting.scheduledReportingForm.recurringLabel',
  {
    defaultMessage: 'Make recurring',
  }
);

export const SCHEDULED_REPORT_FORM_SEND_BY_EMAIL_LABEL = i18n.translate(
  'xpack.reporting.scheduledReportingForm.sendByEmailLabel',
  {
    defaultMessage: 'Send by email',
  }
);

export const SCHEDULED_REPORT_FORM_EMAIL_RECIPIENTS_LABEL = i18n.translate(
  'xpack.reporting.scheduledReportingForm.emailRecipientsLabel',
  {
    defaultMessage: 'To',
  }
);

export const SCHEDULED_REPORT_FORM_EMAIL_RECIPIENTS_REQUIRED_MESSAGE = i18n.translate(
  'xpack.reporting.scheduledReportingForm.emailRecipientsRequiredMessage',
  {
    defaultMessage: 'Provide at least one recipient',
  }
);

export const SCHEDULED_REPORT_FORM_EMAIL_RECIPIENTS_HINT = i18n.translate(
  'xpack.reporting.scheduledReportingForm.emailRecipientsHint',
  {
    defaultMessage:
      "On the scheduled date we'll send an email to these recipients with the file attached",
  }
);

export const SCHEDULED_REPORT_FORM_MISSING_EMAIL_CONNECTOR_TITLE = i18n.translate(
  'xpack.reporting.scheduledReportingForm.missingEmailConnectorTitle',
  {
    defaultMessage: 'No email connector configured',
  }
);

export const SCHEDULED_REPORT_FORM_EMAIL_SENSITIVE_INFO_TITLE = i18n.translate(
  'xpack.reporting.scheduledReportingForm.emailSensitiveInfoTitle',
  {
    defaultMessage: 'Sensitive information',
  }
);

export const CANNOT_LOAD_REPORTING_HEALTH_TITLE = i18n.translate(
  'xpack.reporting.scheduledReportingForm.cannotLoadReportingHealthTitle',
  {
    defaultMessage: 'Cannot load reporting health',
  }
);

export const CANNOT_LOAD_REPORTING_HEALTH_MESSAGE = i18n.translate(
  'xpack.reporting.scheduledReportingForm.cannotLoadReportingHealthMessage',
  {
    defaultMessage: 'Reporting health is a prerequisite to create scheduled exports',
  }
);

export function getInvalidEmailAddress(email: string) {
  return i18n.translate('xpack.stackConnectors.components.email.error.invalidEmail', {
    defaultMessage: 'Email address {email} is not valid',
    values: { email },
  });
}

export function getNotAllowedEmailAddress(email: string) {
  return i18n.translate('xpack.stackConnectors.components.email.error.notAllowed', {
    defaultMessage: 'Email address {email} is not allowed',
    values: { email },
  });
}
