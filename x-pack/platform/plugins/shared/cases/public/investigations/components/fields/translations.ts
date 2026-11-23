/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const MANAGE_TEMPLATES = i18n.translate(
  'xpack.cases.investigations.fields.manageTemplates',
  {
    defaultMessage: 'Manage templates',
  }
);

export const FIELDS_LOADING = i18n.translate('xpack.cases.investigations.fields.loading', {
  defaultMessage: 'Loading the fields of this template',
});
export const FIELDS_ERROR = i18n.translate('xpack.cases.investigations.fields.error', {
  defaultMessage: 'Could not load the fields of this template.',
});
export const SERVER_ERRORS_TITLE = i18n.translate(
  'xpack.cases.investigations.fields.serverErrorsTitle',
  {
    defaultMessage: 'Cases did not accept these values',
  }
);

export const GLOBAL_FIELDS_TITLE = i18n.translate(
  'xpack.cases.investigations.fields.globalFieldsTitle',
  {
    defaultMessage: 'Global fields',
  }
);
export const GLOBAL_FIELDS_LOADING = i18n.translate(
  'xpack.cases.investigations.fields.globalFieldsLoading',
  {
    defaultMessage: 'Loading the global fields',
  }
);
export const GLOBAL_FIELDS_ERROR = i18n.translate(
  'xpack.cases.investigations.fields.globalFieldsError',
  {
    defaultMessage: 'Could not load the global fields.',
  }
);
export const GLOBAL_FIELDS_HELP = i18n.translate(
  'xpack.cases.investigations.fields.globalFieldsHelp',
  {
    defaultMessage: 'Every investigation has these fields, whatever its template.',
  }
);
export const TEMPLATE_FIELDS_TITLE = (template: string) =>
  i18n.translate('xpack.cases.investigations.fields.templateFieldsTitle', {
    defaultMessage: '{template} fields',
    values: { template },
  });
