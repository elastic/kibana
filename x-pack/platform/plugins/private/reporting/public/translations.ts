/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const APP_TITLE = i18n.translate('xpack.reporting.registerFeature.reportingTitle', {
  defaultMessage: 'Reporting',
});

export const APP_DESC = i18n.translate('xpack.reporting.registerFeature.reportingDescription', {
  defaultMessage: 'Manage your reports generated from Discover, Visualize, and Dashboard.',
});

export const LOADING_REPORTS_DESCRIPTION = i18n.translate(
  'xpack.reporting.table.loadingReportsDescription',
  {
    defaultMessage: 'Loading reports',
  }
);

export const NO_CREATED_REPORTS_DESCRIPTION = i18n.translate(
  'xpack.reporting.table.noCreatedReportsDescription',
  {
    defaultMessage: 'No reports have been created',
  }
);
