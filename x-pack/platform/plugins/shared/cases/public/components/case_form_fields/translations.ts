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

export const LEGACY_CUSTOM_FIELDS_DEPRECATION_MESSAGE = i18n.translate(
  'xpack.cases.caseFormFields.legacyCustomFieldsDeprecationMessage',
  {
    defaultMessage:
      'These fields are from the previous custom fields system and have already been migrated. You may see the same fields again below — that is expected while both systems are shown.',
  }
);

export const LEGACY_CUSTOM_FIELDS_VIEW_NEW = i18n.translate(
  'xpack.cases.caseFormFields.legacyCustomFieldsViewNew',
  {
    defaultMessage: 'View new custom fields',
  }
);

export const DEPRECATED_BADGE = i18n.translate('xpack.cases.caseFormFields.deprecatedBadge', {
  defaultMessage: 'Deprecated',
});
