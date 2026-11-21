/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const MANAGE_TYPES = i18n.translate('xpack.cases.investigations.fields.manageTypes', {
  defaultMessage: 'Manage types',
});
export const MANAGE_TYPES_HELP = i18n.translate(
  'xpack.cases.investigations.fields.manageTypesHelp',
  {
    defaultMessage:
      'Investigation types are Cases templates. Open the templates page to add one or change its fields.',
  }
);

export const FIELDS_LOADING = i18n.translate('xpack.cases.investigations.fields.loading', {
  defaultMessage: 'Loading the fields of this type',
});
export const FIELDS_ERROR = i18n.translate('xpack.cases.investigations.fields.error', {
  defaultMessage: 'Could not load the fields of this type.',
});
export const SERVER_ERRORS_TITLE = i18n.translate(
  'xpack.cases.investigations.fields.serverErrorsTitle',
  {
    defaultMessage: 'Cases did not accept these values',
  }
);
