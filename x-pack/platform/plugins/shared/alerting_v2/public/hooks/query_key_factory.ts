/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ruleKeys = {
  all: ['rule'] as const,
  lists: () => [...ruleKeys.all, 'list'] as const,
  list: (filters: { page: number; perPage: number; search?: string }) =>
    [...ruleKeys.lists(), filters] as const,
  details: () => [...ruleKeys.all, 'details'] as const,
  detail: (id: string) => [...ruleKeys.details(), id] as const,
};

export const workflowKeys = {
  all: ['workflow'] as const,
  details: () => [...workflowKeys.all, 'details'] as const,
  detail: (id: string) => [...workflowKeys.details(), id] as const,
  searches: () => [...workflowKeys.all, 'search'] as const,
  search: (params: { query: string }) => [...workflowKeys.searches(), params] as const,
};

export const matcherSuggestionKeys = {
  all: ['matcherSuggestions'] as const,
  dataFields: () => [...matcherSuggestionKeys.all, 'dataFields'] as const,
};

export const notificationPolicyKeys = {
  all: ['notificationPolicy'] as const,
  detail: (id: string) => [...notificationPolicyKeys.all, 'detail', id] as const,
  lists: () => [...notificationPolicyKeys.all, 'list'] as const,
  list: (filters: {
    page: number;
    perPage: number;
    search?: string;
    enabled?: boolean;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  }) => [...notificationPolicyKeys.lists(), filters] as const,
};
