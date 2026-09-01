/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.cases.userActionsFilterBar.searchPlaceholder',
  {
    defaultMessage: 'Search activity',
  }
);

export const AUTHOR = i18n.translate('xpack.cases.userActionsFilterBar.author', {
  defaultMessage: 'Author',
});

export const ALL_AUTHORS = i18n.translate('xpack.cases.userActionsFilterBar.allAuthors', {
  defaultMessage: 'All',
});

export const UNKNOWN_AUTHOR = i18n.translate('xpack.cases.userActionsFilterBar.unknownAuthor', {
  defaultMessage: 'Unknown',
});

export const AUTHORS_SELECTED = (count: number) =>
  i18n.translate('xpack.cases.userActionsFilterBar.authorsSelected', {
    defaultMessage: '{count} selected',
    values: { count },
  });

export const CLEAR_FILTERS = i18n.translate('xpack.cases.userActionsFilterBar.clearFilters', {
  defaultMessage: 'Clear filters',
});
