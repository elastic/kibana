/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EDITED_ALERTS = (totalAlerts: number) =>
  i18n.translate('platform.responseOps.alertsTable.editedAlerts', {
    values: { totalAlerts },
    defaultMessage: 'Edited {totalAlerts, plural, =1 {alert} other {{totalAlerts} alerts}}',
  });

export const SELECTED_ALERTS = (totalAlerts: number) =>
  i18n.translate('platform.responseOps.alertsTable.tags.headerSubtitle', {
    values: { totalAlerts },
    defaultMessage: 'Selected alerts: {totalAlerts}',
  });

export const SAVE_SELECTION = i18n.translate(
  'platform.responseOps.alertsTable.tags.saveSelection',
  {
    defaultMessage: 'Save selection',
  }
);

export const SEARCH_PLACEHOLDER = i18n.translate(
  'platform.responseOps.alertsTable.tags.searchPlaceholder',
  {
    defaultMessage: 'Search',
  }
);

export const CANCEL = i18n.translate('platform.responseOps.alertsTable.tags.cancel', {
  defaultMessage: 'Cancel',
});

export const ADD_TAG_CUSTOM_OPTION_LABEL = (searchValue: string) =>
  i18n.translate('platform.responseOps.alertsTable.configure.addTagCustomOptionLabel', {
    defaultMessage: 'Add {searchValue} as a tag',
    values: { searchValue },
  });

export const EDIT_TAGS = i18n.translate('platform.responseOps.alertsTable.tags.edit', {
  defaultMessage: 'Edit tags',
});

export const TOTAL_TAGS = (totalTags: number) =>
  i18n.translate('platform.responseOps.alertsTable.tags.totalTags', {
    defaultMessage: 'Total tags: {totalTags}',
    values: { totalTags },
  });

export const SELECT_ALL = i18n.translate('platform.responseOps.alertsTable.tags.selectAll', {
  defaultMessage: 'Select all',
});

export const SELECT_NONE = i18n.translate('platform.responseOps.alertsTable.tags.selectNone', {
  defaultMessage: 'Select none',
});

export const SELECTED_TAGS = (selectedTags: number) =>
  i18n.translate('platform.responseOps.alertsTable.tags.selectedTags', {
    defaultMessage: 'Selected: {selectedTags}',
    values: { selectedTags },
  });

export const NO_TAGS_AVAILABLE = i18n.translate(
  'platform.responseOps.alertsTable.tags.noTagsAvailable',
  {
    defaultMessage: 'No tags available. To add a tag, enter it in the query bar',
  }
);

export const NO_SEARCH_MATCH = i18n.translate('platform.responseOps.alertsTable.tags.noTagsMatch', {
  defaultMessage: 'No tags match your search',
});
