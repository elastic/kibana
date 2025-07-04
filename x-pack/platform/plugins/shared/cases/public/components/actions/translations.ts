/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EDITED_CASES = (totalCases: number) =>
  i18n.translate('xpack.cases.containers.editedCases', {
    values: { totalCases },
    defaultMessage: 'Edited {totalCases, plural, =1 {case} other {{totalCases} cases}}',
  });

export const SELECTED_CASES = (totalCases: number) =>
  i18n.translate('xpack.cases.actions.headerSubtitle', {
    values: { totalCases },
    defaultMessage: 'Selected cases: {totalCases}',
  });

export const SAVE_SELECTION = i18n.translate('xpack.cases.actions.saveSelection', {
  defaultMessage: 'Save selection',
});

export const SEARCH_PLACEHOLDER = i18n.translate('xpack.cases.actions.searchPlaceholder', {
  defaultMessage: 'Search',
});
