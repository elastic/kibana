/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CASES_LIST_TITLE = i18n.translate('xpack.cases.casesRedesign.list.title', {
  defaultMessage: 'Cases List (Redesign)',
});

export const CASE_DETAILS_TITLE = i18n.translate('xpack.cases.casesRedesign.details.title', {
  defaultMessage: 'Case Details (Redesign)',
});

export const CASE_SETTINGS_TITLE = i18n.translate('xpack.cases.casesRedesign.settings.title', {
  defaultMessage: 'Case Settings (Redesign)',
});

export const UNDER_CONSTRUCTION = i18n.translate('xpack.cases.casesRedesign.underConstruction', {
  defaultMessage: 'This page is under construction.',
});

export const VIEWING_CASE = (caseId: string) =>
  i18n.translate('xpack.cases.casesRedesign.details.viewingCase', {
    defaultMessage: 'Viewing case: {caseId}. This page is under construction.',
    values: { caseId },
  });

export const SHOW_METRICS = i18n.translate('xpack.cases.casesRedesign.details.showMetrics', {
  defaultMessage: 'Show metrics',
});

export const EDIT_CASE_NAME = i18n.translate('xpack.cases.casesRedesign.details.editCaseName', {
  defaultMessage: 'Edit case name',
});

export const NEW_CASE_NAME_LABEL = i18n.translate(
  'xpack.cases.casesRedesign.details.newCaseNameLabel',
  {
    defaultMessage: 'Case name',
  }
);
