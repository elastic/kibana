/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const CATEGORY = i18n.translate('xpack.siem.fieldBrowser.categoryLabel', {
  defaultMessage: 'Category',
});

export const CATEGORIES = i18n.translate('xpack.siem.fieldBrowser.categoriesTitle', {
  defaultMessage: 'Categories',
});

export const CATEGORIES_COUNT = (totalCount: number) =>
  i18n.translate('xpack.siem.fieldBrowser.categoriesCountTitle', {
    values: { totalCount },
    defaultMessage: '{totalCount} {totalCount, plural, =1 {category} other {categories}}',
  });

export const COPY_TO_CLIPBOARD = i18n.translate('xpack.siem.fieldBrowser.copyToClipboard', {
  defaultMessage: 'Copy to Clipboard',
});

export const CUSTOMIZE_COLUMNS = i18n.translate('xpack.siem.fieldBrowser.customizeColumnsTitle', {
  defaultMessage: 'Customize Columns',
});

export const DESCRIPTION = i18n.translate('xpack.siem.fieldBrowser.descriptionLabel', {
  defaultMessage: 'Description',
});

export const FIELD = i18n.translate('xpack.siem.fieldBrowser.fieldLabel', {
  defaultMessage: 'Field',
});

export const FIELDS = i18n.translate('xpack.siem.fieldBrowser.fieldsTitle', {
  defaultMessage: 'Columns',
});

export const FIELDS_COUNT = (totalCount: number) =>
  i18n.translate('xpack.siem.fieldBrowser.fieldsCountTitle', {
    values: { totalCount },
    defaultMessage: '{totalCount} {totalCount, plural, =1 {field} other {fields}}',
  });

export const FILTER_PLACEHOLDER = i18n.translate('xpack.siem.fieldBrowser.filterPlaceholder', {
  defaultMessage: 'Field name',
});

export const NO_FIELDS_MATCH = i18n.translate('xpack.siem.fieldBrowser.noFieldsMatchLabel', {
  defaultMessage: 'No fields match',
});

export const NO_FIELDS_MATCH_INPUT = (searchInput: string) =>
  i18n.translate('xpack.siem.fieldBrowser.noFieldsMatchInputLabel', {
    defaultMessage: 'No fields match {searchInput}',
    values: {
      searchInput,
    },
  });

export const RESET_FIELDS = i18n.translate('xpack.siem.fieldBrowser.resetFieldsLink', {
  defaultMessage: 'Reset Fields',
});

export const TOGGLE_COLUMN_TOOLTIP = i18n.translate('xpack.siem.fieldBrowser.toggleColumnTooltip', {
  defaultMessage: 'Toggle column',
});

export const VIEW_CATEGORY = (categoryId: string) =>
  i18n.translate('xpack.siem.fieldBrowser.viewCategoryTooltip', {
    defaultMessage: 'View all {categoryId} fields',
    values: {
      categoryId,
    },
  });
