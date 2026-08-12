/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export * from '../../common/translations';

export const CUSTOM_FIELDS = i18n.translate('xpack.cases.customFields', {
  defaultMessage: 'Custom fields',
});

export const LEGACY_CUSTOM_FIELDS_SECTION_TITLE = i18n.translate(
  'xpack.cases.caseFormFields.legacyCustomFieldsSectionTitle',
  {
    defaultMessage: 'Legacy custom fields',
  }
);

export const LEGACY_CUSTOM_FIELDS_VIEW_CUSTOM_FIELDS = i18n.translate(
  'xpack.cases.caseFormFields.legacyCustomFieldsViewCustomFields',
  {
    defaultMessage: 'custom fields',
  }
);

export const LEGACY_CUSTOM_FIELDS_VIEW_SETTINGS = i18n.translate(
  'xpack.cases.caseFormFields.legacyCustomFieldsViewSettings',
  {
    defaultMessage: 'settings',
  }
);

export const DEPRECATED_BADGE = i18n.translate('xpack.cases.caseFormFields.deprecatedBadge', {
  defaultMessage: 'Deprecated',
});
