/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SCHEDULED_REPORT_FORM_EMAIL_SUBJECT_DEFAULT_VALUE = i18n.translate(
  'xpack.reporting.scheduledReportingForm.emailSubjectDefaultValue',
  {
    defaultMessage: "'{{title}}'-'{{date}}' scheduled report",
    description:
      'The curly braces are Mustache interpolations, not translation variables, hence the single quotes around them.',
  }
);

export const SCHEDULED_REPORT_FORM_EMAIL_MESSAGE_DEFAULT_VALUE = i18n.translate(
  'xpack.reporting.scheduledReportingForm.emailMessageDefaultValue',
  {
    defaultMessage: 'Your scheduled report is attached for you to download or share.',
  }
);
