/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export { CASES, MAINTENANCE_WINDOWS } from '../translations';

export const CATEGORY = i18n.translate('xpack.triggersActionsUI.fieldBrowser.categoryLabel', {
  defaultMessage: 'Category',
});

export const CATEGORIES = i18n.translate('xpack.triggersActionsUI.fieldBrowser.categoriesTitle', {
  defaultMessage: 'Categories',
});

export const CATEGORIES_COUNT = (totalCount: number) =>
  i18n.translate('xpack.triggersActionsUI.fieldBrowser.categoriesCountTitle', {
    values: { totalCount },
    defaultMessage: '{totalCount} {totalCount, plural, =1 {category} other {categories}}',
  });

export const CLOSE = i18n.translate('xpack.triggersActionsUI.fieldBrowser.closeButton', {
  defaultMessage: 'Close',
});

export const FIELDS_BROWSER = i18n.translate(
  'xpack.triggersActionsUI.fieldBrowser.fieldBrowserTitle',
  {
    defaultMessage: 'Fields',
  }
);

export const DESCRIPTION = i18n.translate('xpack.triggersActionsUI.fieldBrowser.descriptionLabel', {
  defaultMessage: 'Description',
});

export const DESCRIPTION_FOR_FIELD = (field: string) =>
  i18n.translate('xpack.triggersActionsUI.fieldBrowser.descriptionForScreenReaderOnly', {
    values: {
      field,
    },
    defaultMessage: 'Description for field {field}:',
  });

export const NAME = i18n.translate('xpack.triggersActionsUI.fieldBrowser.fieldName', {
  defaultMessage: 'Name',
});

export const FIELD = i18n.translate('xpack.triggersActionsUI.fieldBrowser.fieldLabel', {
  defaultMessage: 'Field',
});

export const FIELDS = i18n.translate('xpack.triggersActionsUI.fieldBrowser.fieldsTitle', {
  defaultMessage: 'Fields',
});

export const FIELDS_SHOWING = i18n.translate(
  'xpack.triggersActionsUI.fieldBrowser.fieldsCountShowing',
  {
    defaultMessage: 'Showing',
  }
);

export const FIELDS_COUNT = (totalCount: number) =>
  i18n.translate('xpack.triggersActionsUI.fieldBrowser.fieldsCountTitle', {
    values: { totalCount },
    defaultMessage: '{totalCount, plural, =1 {field} other {fields}}',
  });

export const FILTER_PLACEHOLDER = i18n.translate(
  'xpack.triggersActionsUI.fieldBrowser.filterPlaceholder',
  {
    defaultMessage: 'Field name',
  }
);

export const NO_FIELDS_MATCH = i18n.translate(
  'xpack.triggersActionsUI.fieldBrowser.noFieldsMatchLabel',
  {
    defaultMessage: 'No fields match',
  }
);

export const NO_FIELDS_MATCH_INPUT = (searchInput: string) =>
  i18n.translate('xpack.triggersActionsUI.fieldBrowser.noFieldsMatchInputLabel', {
    defaultMessage: 'No fields match {searchInput}',
    values: {
      searchInput,
    },
  });

export const RESET_FIELDS = i18n.translate('xpack.triggersActionsUI.fieldBrowser.resetFieldsLink', {
  defaultMessage: 'Reset Fields',
});

export const VIEW_COLUMN = (field: string) =>
  i18n.translate('xpack.triggersActionsUI.fieldBrowser.viewColumnCheckboxAriaLabel', {
    values: { field },
    defaultMessage: 'View {field} column',
  });

export const VIEW_LABEL = i18n.translate('xpack.triggersActionsUI.fieldBrowser.viewLabel', {
  defaultMessage: 'View',
});

export const VIEW_VALUE_SELECTED = i18n.translate(
  'xpack.triggersActionsUI.fieldBrowser.viewSelected',
  {
    defaultMessage: 'selected',
  }
);

export const VIEW_VALUE_ALL = i18n.translate('xpack.triggersActionsUI.fieldBrowser.viewAll', {
  defaultMessage: 'all',
});
