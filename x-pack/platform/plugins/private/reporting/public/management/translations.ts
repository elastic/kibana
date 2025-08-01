/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SCHEDULE_EXPORT_BUTTON_LABEL = i18n.translate(
  'xpack.reporting.scheduleExportButtonLabel',
  {
    defaultMessage: 'Schedule export',
  }
);

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

export const SCHEDULED_REPORT_FORM_OPTIMIZED_FOR_PRINTING_LABEL = i18n.translate(
  'xpack.reporting.scheduledReportingForm.optimizedForPrintingLabel',
  {
    defaultMessage: 'Print format',
  }
);

export const SCHEDULED_REPORT_FORM_OPTIMIZED_FOR_PRINTING_DESCRIPTION = i18n.translate(
  'xpack.reporting.scheduledReportingForm.optimizedForDescription',
  {
    defaultMessage: 'Uses multiple pages, showing at most 2 visualizations per page',
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
      "On the scheduled date, we'll create a snapshot of this data point and will post the downloadable report on the ",
  }
);

export const REPORTING_PAGE_LINK_TEXT = i18n.translate(
  'xpack.reporting.scheduledReportingForm.reportingPageLinkText',
  {
    defaultMessage: 'Reporting page',
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

export const SCHEDULED_REPORT_FORM_NO_USER_EMAIL_HINT = i18n.translate(
  'xpack.reporting.scheduledReportingForm.noUserEmailHint',
  {
    defaultMessage:
      'To receive reports by email, you must have an email address set in your user profile.',
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
      "On the scheduled date, we'll also email the report to the addresses you specify here.",
  }
);

export const SCHEDULED_REPORT_FORM_EMAIL_SELF_HINT = i18n.translate(
  'xpack.reporting.scheduledReportingForm.emailSelfHint',
  {
    defaultMessage: "On the scheduled date, we'll also email the report to your address.",
  }
);

export const SCHEDULED_REPORT_FORM_MISSING_EMAIL_CONNECTOR_TITLE = i18n.translate(
  'xpack.reporting.scheduledReportingForm.missingEmailConnectorTitle',
  {
    defaultMessage: "Email connector hasn't been created yet",
  }
);

export const SCHEDULED_REPORT_FORM_MISSING_EMAIL_CONNECTOR_MESSAGE = i18n.translate(
  'xpack.reporting.scheduledReportingForm.missingEmailConnectorMessage',
  {
    defaultMessage: 'A default email connector must be configured in order to send notifications.',
  }
);

export const SCHEDULED_REPORT_FORM_EMAIL_SENSITIVE_INFO_TITLE = i18n.translate(
  'xpack.reporting.scheduledReportingForm.emailSensitiveInfoTitle',
  {
    defaultMessage: 'Sensitive information',
  }
);

export const SCHEDULED_REPORT_FORM_EMAIL_SENSITIVE_INFO_MESSAGE = i18n.translate(
  'xpack.reporting.scheduledReportingForm.emailSensitiveInfoMessage',
  {
    defaultMessage: 'Report may contain sensitive information',
  }
);

export const SCHEDULED_REPORT_FORM_SUCCESS_TOAST_TITLE = i18n.translate(
  'xpack.reporting.scheduledReportingForm.successToastTitle',
  {
    defaultMessage: 'Export scheduled',
  }
);

export const SCHEDULED_REPORT_FORM_CREATE_EMAIL_CONNECTOR_LABEL = i18n.translate(
  'xpack.reporting.scheduledReportingForm.createEmailConnectorLabel',
  {
    defaultMessage: 'Create Email connector',
  }
);

export const SCHEDULED_REPORT_FORM_SUCCESS_TOAST_MESSAGE = i18n.translate(
  'xpack.reporting.scheduledReportingForm.successToastMessage',
  {
    defaultMessage: 'Find your schedule information and your exports in the ',
  }
);

export const SCHEDULED_REPORT_FORM_FAILURE_TOAST_TITLE = i18n.translate(
  'xpack.reporting.scheduledReportingForm.failureToastTitle',
  {
    defaultMessage: 'Schedule error',
  }
);

export const SCHEDULED_REPORT_FORM_FAILURE_TOAST_MESSAGE = i18n.translate(
  'xpack.reporting.scheduledReportingForm.failureToastMessage',
  {
    defaultMessage: 'Sorry, we couldn’t schedule your export. Please try again.',
  }
);

export const SCHEDULED_REPORT_NO_REPORT_TYPES_TITLE = i18n.translate(
  'xpack.reporting.scheduledReportingForm.noReportTypesTitle',
  {
    defaultMessage: 'Scheduled reports are not supported here yet',
  }
);

export const SCHEDULED_REPORT_NO_REPORT_TYPES_MESSAGE = i18n.translate(
  'xpack.reporting.scheduledReportingForm.noReportTypesMessage',
  {
    defaultMessage: 'Report types in this page are not supported for scheduled reports yet.',
  }
);

export const CANNOT_LOAD_REPORTING_HEALTH_TITLE = i18n.translate(
  'xpack.reporting.scheduledReportingForm.cannotLoadReportingHealthTitle',
  {
    defaultMessage: 'Cannot load reporting health',
  }
);

export const UNMET_REPORTING_PREREQUISITES_TITLE = i18n.translate(
  'xpack.reporting.scheduledReportingForm.unmetReportingPrerequisitesTitle',
  {
    defaultMessage: 'Cannot schedule reports',
  }
);

export const UNMET_REPORTING_PREREQUISITES_MESSAGE = i18n.translate(
  'xpack.reporting.scheduledReportingForm.unmetReportingPrerequisitesMessage',
  {
    defaultMessage:
      'One or more prerequisites for scheduling reports was not met. Contact your administrator to know more.',
  }
);

export const CANNOT_LOAD_REPORTING_HEALTH_MESSAGE = i18n.translate(
  'xpack.reporting.scheduledReportingForm.cannotLoadReportingHealthMessage',
  {
    defaultMessage: 'Reporting health is a prerequisite to create scheduled exports',
  }
);

export const TECH_PREVIEW_LABEL = i18n.translate('xpack.reporting.technicalPreviewBadgeLabel', {
  defaultMessage: 'Technical preview',
});

export const TECH_PREVIEW_DESCRIPTION = i18n.translate(
  'xpack.reporting.technicalPreviewBadgeDescription',
  {
    defaultMessage:
      'This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
  }
);

export function getInvalidEmailAddress(email: string) {
  return i18n.translate('xpack.reporting.components.email.error.invalidEmail', {
    defaultMessage: 'Email address {email} is not valid',
    values: { email },
  });
}

export function getNotAllowedEmailAddress(email: string) {
  return i18n.translate('xpack.reporting.components.email.error.notAllowed', {
    defaultMessage: 'Email address {email} is not allowed',
    values: { email },
  });
}
