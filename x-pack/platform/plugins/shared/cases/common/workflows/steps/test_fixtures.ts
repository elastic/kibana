/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCaseRequestFixture, createCaseResponseFixture } from '../../fixtures/create_case';

export { createCaseRequestFixture, createCaseResponseFixture };

export const caseIdFixture = 'case-1';
export const caseVersionFixture = 'WzQ3LDFd';
export const caseTitleFixture = 'Updated title';
export const caseDescriptionFixture = 'Updated description';
export const caseSeverityFixture = 'high';
export const caseStatusFixture = 'in-progress';
export const caseCategoryFixture = 'Malware';
export const caseTagsFixture = ['triage'];
export const caseAssigneesFixture = [{ uid: 'user-1' }];

export const addCommentInputFixture = {
  case_id: caseIdFixture,
  comment: 'Investigating now',
};

export const updateCaseInputFixture = {
  case_id: caseIdFixture,
  updates: { title: caseTitleFixture },
};

export const updateCaseInputWithVersionFixture = {
  ...updateCaseInputFixture,
  version: caseVersionFixture,
};

export const updateCasesInputFixture = {
  cases: [updateCaseInputFixture],
};

export const updateCasesInputWithVersionFixture = {
  cases: [updateCaseInputWithVersionFixture],
};

export const setCustomFieldTextInputFixture = {
  case_id: caseIdFixture,
  field_name: 'cf_text',
  value: 'new value',
};

export const setCustomFieldToggleInputFixture = {
  case_id: caseIdFixture,
  field_name: 'cf_toggle',
  value: true,
};

export const setCustomFieldNumberInputFixture = {
  case_id: caseIdFixture,
  field_name: 'cf_number',
  value: 42,
};

export const setCustomFieldNullInputFixture = {
  case_id: caseIdFixture,
  field_name: 'cf_optional',
  value: null,
};

export const setSeverityInputFixture = {
  case_id: caseIdFixture,
  severity: caseSeverityFixture,
};

export const setStatusInputFixture = {
  case_id: caseIdFixture,
  status: caseStatusFixture,
};

export const closeCaseInputFixture = {
  case_id: caseIdFixture,
};

export const assignCaseInputFixture = {
  case_id: caseIdFixture,
  assignees: caseAssigneesFixture,
};

export const unassignCaseInputFixture = {
  case_id: caseIdFixture,
  assignees: [],
};

export const addAlertsInputFixture = {
  case_id: caseIdFixture,
  alerts: [{ alertId: 'alert-1', index: '.alerts-security.alerts-default' }],
};

export const addEventsInputFixture = {
  case_id: caseIdFixture,
  events: [{ eventId: 'event-1', index: '.ds-logs-*' }],
};

export const addObservablesInputFixture = {
  case_id: caseIdFixture,
  observables: [{ typeKey: 'ip', value: '10.0.0.8' }],
};

export const addTagInputFixture = {
  case_id: caseIdFixture,
  tags: caseTagsFixture,
};

export const addCategoryInputFixture = {
  case_id: caseIdFixture,
  category: caseCategoryFixture,
};

export const setDescriptionInputFixture = {
  case_id: caseIdFixture,
  description: caseDescriptionFixture,
};

export const setTitleInputFixture = {
  case_id: caseIdFixture,
  title: caseTitleFixture,
};

export const findSimilarCasesInputFixture = {
  case_id: caseIdFixture,
  page: 1,
  perPage: 20,
};

export const findSimilarCasesOutputFixture = {
  cases: [
    {
      ...createCaseResponseFixture,
      similarities: {
        observables: [{ typeKey: 'ip', typeLabel: 'IP', value: '10.0.0.8' }],
      },
    },
  ],
  page: 1,
  per_page: 20,
  total: 1,
};

export const findCasesInputFixture = {
  owner: 'securitySolution',
  status: ['open', 'in-progress'],
  severity: 'high',
  search: 'incident',
  searchFields: ['title', 'description'],
  sortField: 'updatedAt',
  sortOrder: 'desc',
  tags: ['tag-1', 'tag-2'],
  page: 1,
  perPage: 20,
};

export const findCasesOutputFixture = {
  cases: [createCaseResponseFixture],
  count_closed_cases: 0,
  count_in_progress_cases: 0,
  count_open_cases: 1,
  page: 1,
  per_page: 20,
  total: 1,
};
