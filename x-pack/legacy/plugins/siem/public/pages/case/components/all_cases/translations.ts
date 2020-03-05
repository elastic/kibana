/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export * from '../../translations';

export const NO_CASES = i18n.translate('xpack.siem.case.caseTable.noCases.title', {
  defaultMessage: 'No Cases',
});
export const NO_CASES_BODY = i18n.translate('xpack.siem.case.caseTable.noCases.body', {
  defaultMessage: 'Create a new case to see it displayed in the case workflow table.',
});
export const ADD_NEW_CASE = i18n.translate('xpack.siem.case.caseTable.addNewCase', {
  defaultMessage: 'Add New Case',
});

export const SELECTED_CASES = (totalRules: number) =>
  i18n.translate('xpack.siem.case.caseTable.selectedCasesTitle', {
    values: { totalRules },
    defaultMessage: 'Selected {totalRules} {totalRules, plural, =1 {case} other {cases}}',
  });

export const SHOWING_CASES = (totalRules: number) =>
  i18n.translate('xpack.siem.case.caseTable.showingCasesTitle', {
    values: { totalRules },
    defaultMessage: 'Showing {totalRules} {totalRules, plural, =1 {case} other {cases}}',
  });

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.siem.case.caseTable.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {case} other {cases}}`,
  });

export const SEARCH_CASES = i18n.translate('xpack.siem.case.caseTable.searchAriaLabel', {
  defaultMessage: 'Search cases',
});

export const BULK_ACTIONS = i18n.translate('xpack.siem.case.caseTable.bulkActions', {
  defaultMessage: 'Bulk actions',
});

export const SEARCH_PLACEHOLDER = i18n.translate('xpack.siem.case.caseTable.searchPlaceholder', {
  defaultMessage: 'e.g. case name',
});
export const OPEN_CASES = i18n.translate('xpack.siem.case.caseTable.openCases', {
  defaultMessage: 'Open cases',
});
export const CLOSED_CASES = i18n.translate('xpack.siem.case.caseTable.closedCases', {
  defaultMessage: 'Closed cases',
});

export const CLOSED = i18n.translate('xpack.siem.case.caseTable.closed', {
  defaultMessage: 'Closed',
});
export const DELETE = i18n.translate('xpack.siem.case.caseTable.delete', {
  defaultMessage: 'Delete',
});
export const REOPEN_CASE = i18n.translate('xpack.siem.case.caseTable.reopenCase', {
  defaultMessage: 'Reopen case',
});
export const CLOSE_CASE = i18n.translate('xpack.siem.case.caseTable.closeCase', {
  defaultMessage: 'Close case',
});
export const DUPLICATE_CASE = i18n.translate('xpack.siem.case.caseTable.duplicateCase', {
  defaultMessage: 'Duplicate case',
});
