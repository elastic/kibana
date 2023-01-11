/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const COPIED_ERRORS_TOAST_TITLE = i18n.translate(
  'ecsDataQualityDashboard.toasts.copiedErrorsToastTitle',
  {
    defaultMessage: 'Copied errors to the clipboard',
  }
);

export const COPY_TO_CLIPBOARD = i18n.translate(
  'ecsDataQualityDashboard.errorsPopover.copyToClipboardButton',
  {
    defaultMessage: 'Copy to clipboard',
  }
);

export const ERRORS = i18n.translate('ecsDataQualityDashboard.errorsPopover.errorsTitle', {
  defaultMessage: 'Errors',
});

export const ERRORS_CALLOUT_SUMMARY = i18n.translate(
  'ecsDataQualityDashboard.errorsPopover.errorsCalloutSummary',
  {
    defaultMessage: 'Some indices were not checked for Data Quality',
  }
);

export const ERRORS_CALLOUT_DETAILS = i18n.translate(
  'ecsDataQualityDashboard.errorsPopover.errorsCalloutDetails',
  {
    defaultMessage:
      "Errors may occur when pattern or index metadata is temporarily unavailable, or because you don't have permission to access them.",
  }
);

export const VIEW_ERRORS = i18n.translate(
  'ecsDataQualityDashboard.errorsPopover.viewErrorsButton',
  {
    defaultMessage: 'View errors',
  }
);
