/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const ALL_CASES = i18n.translate('xpack.siem.caseTable.title', {
  defaultMessage: 'All Cases',
});
export const NO_CASES = i18n.translate('xpack.siem.caseTable.noCases.title', {
  defaultMessage: 'No Cases',
});
export const NO_CASES_BODY = i18n.translate('xpack.siem.caseTable.noCases.body', {
  defaultMessage: 'Create a new case to see it displayed in the case workflow table.',
});
export const ADD_NEW_CASE = i18n.translate('xpack.siem.caseTable.addNewCase', {
  defaultMessage: 'Add New Case',
});

export const SHOWING_CASES = (totalRules: number) =>
  i18n.translate('xpack.siem.caseTable.showingCasesTitle', {
    values: { totalRules },
    defaultMessage: 'Showing {totalRules} {totalRules, plural, =1 {case} other {cases}}',
  });

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.siem.caseTable.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {case} other {cases}}`,
  });

export const CASE_TITLE = i18n.translate('xpack.siem.caseTable.columnHeader.caseTitle', {
  defaultMessage: 'Case Title',
});

export const CASE_ID = i18n.translate('xpack.siem.caseTable.columnHeader.caseId', {
  defaultMessage: 'Case Id',
});

export const TAGS = i18n.translate('xpack.siem.caseTable.columnHeader.tags', {
  defaultMessage: 'Tags',
});

export const CREATED_AT = i18n.translate('xpack.siem.caseTable.columnHeader.caseTitle', {
  defaultMessage: 'Created at',
});

export const CREATED_BY = i18n.translate('xpack.siem.caseTable.columnHeader.caseTitle', {
  defaultMessage: 'Created by',
});

export const LAST_UPDATED = i18n.translate('xpack.siem.caseTable.columnHeader.caseTitle', {
  defaultMessage: 'Last updated',
});

export const STATE = i18n.translate('xpack.siem.caseTable.columnHeader.caseTitle', {
  defaultMessage: 'State',
});
