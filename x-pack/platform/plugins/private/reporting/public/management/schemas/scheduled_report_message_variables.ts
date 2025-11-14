/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionVariable } from '@kbn/alerting-types';
import { i18n } from '@kbn/i18n';

export const scheduledReportMessageVariables: ActionVariable[] = [
  {
    name: 'title',
    description: i18n.translate('xpack.reporting.scheduledReport.variables.title', {
      defaultMessage: 'The title of the reported object, i.e. dashboard or visualization.',
    }),
  },
  {
    name: 'filename',
    description: i18n.translate('xpack.reporting.scheduledReport.variables.filename', {
      defaultMessage: 'The filename of the generated report.',
    }),
  },
  {
    name: 'objectType',
    description: i18n.translate('xpack.reporting.scheduledReport.variables.objectType', {
      defaultMessage: 'The type of the reported object, e.g. dashboard or visualization.',
    }),
  },
  {
    name: 'date',
    description: i18n.translate('xpack.reporting.scheduledReport.variables.date', {
      defaultMessage: 'The date and time when the report was generated.',
    }),
  },
  {
    name: 'output.contentType',
    description: i18n.translate('xpack.reporting.scheduledReport.variables.outputContentType', {
      defaultMessage: 'The MIME type of the generated report.',
    }),
  },
  {
    name: 'output.csvContainsFormulas',
    description: i18n.translate(
      'xpack.reporting.scheduledReport.variables.outputCsvContainsFormulas',
      {
        defaultMessage: 'Boolean flag indicating if the CSV contains formulas.',
      }
    ),
  },
  {
    name: 'output.errorCode',
    description: i18n.translate('xpack.reporting.scheduledReport.variables.outputErrorCode', {
      defaultMessage: 'The error code if the report generation failed.',
    }),
  },
  {
    name: 'output.maxSizeReached',
    description: i18n.translate('xpack.reporting.scheduledReport.variables.outputMaxSizeReached', {
      defaultMessage:
        'Boolean flag indicating if the maximum size was reached during report generation.',
    }),
  },
  {
    name: 'output.hasUserError',
    description: i18n.translate('xpack.reporting.scheduledReport.variables.outputHasUserError', {
      defaultMessage: 'Boolean flag indicating if there was a user error during report generation.',
    }),
  },
  {
    name: 'output.warnings',
    description: i18n.translate('xpack.reporting.scheduledReport.variables.outputWarnings', {
      defaultMessage: 'Array of warnings generated during report creation.',
    }),
  },
];
