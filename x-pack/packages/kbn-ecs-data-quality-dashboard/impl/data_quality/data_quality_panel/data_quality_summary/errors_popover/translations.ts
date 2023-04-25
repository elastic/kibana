/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const COPIED_ERRORS_TOAST_TITLE = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.toasts.copiedErrorsToastTitle',
  {
    defaultMessage: 'Copied errors to the clipboard',
  }
);

export const COPY_TO_CLIPBOARD = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.errorsPopover.copyToClipboardButton',
  {
    defaultMessage: 'Copy to clipboard',
  }
);

export const ERRORS = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.errorsPopover.errorsTitle',
  {
    defaultMessage: 'Errors',
  }
);

export const ERRORS_CALLOUT_SUMMARY = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.errorsPopover.errorsCalloutSummary',
  {
    defaultMessage: 'Some indices were not checked for Data Quality',
  }
);

export const ERRORS_MAY_OCCUR = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.errors.errorMayOccurLabel',
  {
    defaultMessage:
      "Errors may occur when pattern or index metadata is temporarily unavailable, or because you don't have the privileges required for access",
  }
);

export const MANAGE = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.errors.manage',
  {
    defaultMessage: 'manage',
  }
);

export const MONITOR = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.errors.monitor',
  {
    defaultMessage: 'monitor',
  }
);

export const OR = i18n.translate('securitySolutionPackages.ecsDataQualityDashboard.errors.or', {
  defaultMessage: 'or',
});

export const READ = i18n.translate('securitySolutionPackages.ecsDataQualityDashboard.errors.read', {
  defaultMessage: 'read',
});

export const THE_FOLLOWING_PRIVILEGES_ARE_REQUIRED = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.errors.theFollowingPrivilegesLabel',
  {
    defaultMessage: 'The following privileges are required to check an index:',
  }
);

export const VIEW_ERRORS = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.errorsPopover.viewErrorsButton',
  {
    defaultMessage: 'View errors',
  }
);

export const VIEW_INDEX_METADATA = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.errors.viewIndexMetadata',
  {
    defaultMessage: 'view_index_metadata',
  }
);
