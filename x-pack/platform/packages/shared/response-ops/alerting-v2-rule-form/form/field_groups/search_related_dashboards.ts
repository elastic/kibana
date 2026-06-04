/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionExecutionContext, UiActionsStart } from '@kbn/ui-actions-plugin/public';

export interface Dashboard {
  id: string;
  title: string;
}

export const searchRelatedDashboard = async (
  uiActions: UiActionsStart,
  options: { search?: string; perPage?: number } = {}
): Promise<Dashboard[]> => {
  const { search, perPage = 100 } = options;
  const searchAction = await uiActions.getAction('searchDashboardAction');
  return new Promise((resolve) => {
    searchAction.execute({
      onResults: resolve,
      search: {
        query: search,
        per_page: perPage,
      },
      trigger: { id: 'searchDashboards' },
    } as ActionExecutionContext);
  });
};

export const getDashboardsById = async (
  uiActions: UiActionsStart,
  ids: string[]
): Promise<Dashboard[]> => {
  if (!ids.length) {
    return [];
  }

  const getDashboardsByIdsAction = await uiActions.getAction('getDashboardsByIdsAction');
  return new Promise((resolve) => {
    getDashboardsByIdsAction.execute({
      onResults: resolve,
      ids,
      trigger: { id: 'getDashboardsById' },
    } as ActionExecutionContext);
  });
};
