/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AllCasesTableState } from '../components/all_cases/types';
import type { FilterOptions, QueryParams, SingleCaseMetricsFeature } from './types';
import { SortFieldCase } from './types';

export const DEFAULT_TABLE_ACTIVE_PAGE = 1;
export const DEFAULT_TABLE_LIMIT = 10;

export const casesQueriesKeys = {
  all: ['cases'] as const,
  users: ['users'] as const,
  connectors: ['connectors'] as const,
  alerts: ['alerts'] as const,
  userActions: ['user-actions'] as const,
  templates: ['templates'] as const,
  template: (templateId: string) => [...casesQueriesKeys.templates, 'detail', templateId] as const,
  templatesList: () => [...casesQueriesKeys.templates, 'list'] as const,
  templatesAll: (params: unknown) => [...casesQueriesKeys.templatesList(), params] as const,
  templatesTags: () => [...casesQueriesKeys.templates, 'tags'] as const,
  templatesCreators: () => [...casesQueriesKeys.templates, 'creators'] as const,
  connectorsList: () => [...casesQueriesKeys.connectors, 'list'] as const,
  casesList: () => [...casesQueriesKeys.all, 'list'] as const,
  casesMetrics: () => [...casesQueriesKeys.casesList(), 'metrics'] as const,
  casesStatuses: () => [...casesQueriesKeys.casesList(), 'statuses'] as const,
  cases: (params: unknown) => [...casesQueriesKeys.casesList(), 'all-cases', params] as const,
  similarCases: (id: string, params: unknown) =>
    [...casesQueriesKeys.caseView(), id, 'similar', params] as const,
  caseView: () => [...casesQueriesKeys.all, 'case'] as const,
  case: (id: string) => [...casesQueriesKeys.caseView(), id] as const,
  caseFiles: (id: string, params: unknown) =>
    [...casesQueriesKeys.case(id), 'files', params] as const,
  caseFileStats: (id: string, params?: unknown) =>
    [...casesQueriesKeys.case(id), 'files', 'stats', params] as const,
  caseMetrics: (id: string, features: SingleCaseMetricsFeature[]) =>
    [...casesQueriesKeys.case(id), 'metrics', features] as const,
  caseConnectors: (id: string) => [...casesQueriesKeys.case(id), 'connectors'],
  caseUsers: (id: string) => [...casesQueriesKeys.case(id), 'users'],
  caseUserActions: (id: string, params: unknown) =>
    [...casesQueriesKeys.case(id), ...casesQueriesKeys.userActions, params] as const,
  caseUserActionsStats: (id: string) => [
    ...casesQueriesKeys.case(id),
    ...casesQueriesKeys.userActions,
    'stats',
  ],
  userProfiles: () => [...casesQueriesKeys.users, 'user-profiles'] as const,
  userProfilesList: (ids: string[]) => [...casesQueriesKeys.userProfiles(), ids] as const,
  currentUser: () => [...casesQueriesKeys.users, 'current-user'] as const,
  suggestUsers: (params: unknown) => [...casesQueriesKeys.users, 'suggest', params] as const,
  connectorTypes: () => [...casesQueriesKeys.connectors, 'types'] as const,
  license: () => [...casesQueriesKeys.connectors, 'license'] as const,
  tags: () => [...casesQueriesKeys.all, 'tags'] as const,
  categories: () => [...casesQueriesKeys.all, 'categories'] as const,
  alertFeatureIds: (alertIds: string[]) =>
    [...casesQueriesKeys.alerts, 'features', alertIds] as const,
  configuration: (params: unknown) => [...casesQueriesKeys.all, 'configuration', params] as const,
};

export const casesMutationsKeys = {
  createCase: ['create-case'] as const,
  deleteCases: ['delete-cases'] as const,
  updateCase: ['update-case'] as const,
  updateCases: ['update-cases'] as const,
  pushCase: ['push-case'] as const,
  updateComment: ['update-comment'] as const,
  deleteComment: ['delete-comment'] as const,
  deleteFileAttachment: ['delete-file-attachment'] as const,
  bulkCreateAttachments: ['bulk-create-attachments'] as const,
  persistCaseConfiguration: ['persist-case-configuration'] as const,
  replaceCustomField: ['replace-custom-field'] as const,
  postObservable: ['post-observable'] as const,
  patchObservable: ['patch-observable'] as const,
  deleteObservable: ['delete-observable'] as const,
  bulkPostObservables: ['bulk-post-observables'] as const,
  createTemplate: ['create-template'] as const,
  updateTemplate: ['update-template'] as const,
  deleteTemplate: ['delete-template'] as const,
  exportTemplate: ['export-template'] as const,
  bulkDeleteTemplates: ['bulk-delete-templates'] as const,
  bulkExportTemplates: ['bulk-export-templates'] as const,
};

export const inferenceKeys = {
  getConnectors: () => ['get-inference-connectors'] as const,
};

const DEFAULT_SEARCH_FIELDS = [
  'cases.title',
  'cases.description',
  'cases.incremental_id.text',
  'cases.observables.value',
  'cases.customFields.value',
  'cases-comments.comment',
  'cases-comments.alertId',
  'cases-comments.eventId',
];

export const DEFAULT_FROM_DATE = 'now-30d';
export const DEFAULT_TO_DATE = 'now';

// TODO: Remove reporters. Move searchFields to API.
export const DEFAULT_FILTER_OPTIONS: FilterOptions = {
  search: '',
  searchFields: DEFAULT_SEARCH_FIELDS,
  severity: [],
  assignees: [],
  reporters: [],
  status: [],
  tags: [],
  owner: [],
  category: [],
  customFields: {},
  from: DEFAULT_FROM_DATE,
  to: DEFAULT_TO_DATE,
};

export const DEFAULT_QUERY_PARAMS: QueryParams = {
  page: DEFAULT_TABLE_ACTIVE_PAGE,
  perPage: DEFAULT_TABLE_LIMIT,
  sortField: SortFieldCase.createdAt,
  sortOrder: 'desc',
};

export const DEFAULT_CASES_TABLE_STATE: AllCasesTableState = {
  filterOptions: DEFAULT_FILTER_OPTIONS,
  queryParams: DEFAULT_QUERY_PARAMS,
};
