/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export * from '../../common/translations';

export const EDIT_CATEGORIES_ARIA = i18n.translate('xpack.cases.caseView.editCategoriesLinkAria', {
  defaultMessage: 'click to edit categories',
});

export const EMPTY_CATEGORY_VALIDATION_MSG = i18n.translate(
  'xpack.cases.caseView.emptyCategoryValidationMsg',
  {
    defaultMessage: 'Empty category is not allowed',
  }
);

export const REMOVE_CATEGORY = i18n.translate('xpack.cases.caseView.removeCategory', {
  defaultMessage: 'Remove category',
});

export const REMOVE_CATEGORY_ARIA_LABEL = i18n.translate(
  'xpack.cases.caseView.removeCategoryAriaLabel',
  {
    defaultMessage: 'click to remove category',
  }
);
