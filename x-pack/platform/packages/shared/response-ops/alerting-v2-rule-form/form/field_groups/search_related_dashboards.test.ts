/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import {
  getDashboardsById,
  searchRelatedDashboard,
  type Dashboard,
} from './search_related_dashboards';

interface SearchDashboardsContext {
  onResults: (dashboards: Dashboard[]) => void;
  search: {
    query?: string;
    per_page: number;
  };
  trigger: { id: string };
}

interface GetDashboardsByIdContext {
  ids: string[];
  onResults: (dashboards: Dashboard[]) => void;
  trigger: { id: string };
}

const dashboard: Dashboard = {
  id: 'dashboard-1',
  title: 'Dashboard 1',
};

describe('search related dashboards', () => {
  const searchExecute = jest.fn((context: SearchDashboardsContext) => {
    context.onResults([dashboard]);
  });
  const getDashboardsByIdsExecute = jest.fn((context: GetDashboardsByIdContext) => {
    context.onResults([dashboard]);
  });
  const getAction = jest.fn((actionId: string) => {
    if (actionId === 'getDashboardsByIdsAction') {
      return Promise.resolve({ execute: getDashboardsByIdsExecute });
    }

    return Promise.resolve({ execute: searchExecute });
  });
  const uiActions = { getAction } as unknown as UiActionsStart;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('searches dashboards with the dashboard search action', async () => {
    const result = await searchRelatedDashboard(uiActions, { search: 'error rate', perPage: 25 });

    expect(result).toEqual([dashboard]);
    expect(getAction).toHaveBeenCalledWith('searchDashboardAction');
    expect(searchExecute).toHaveBeenCalledWith({
      onResults: expect.any(Function),
      search: {
        query: 'error rate',
        per_page: 25,
      },
      trigger: { id: 'searchDashboards' },
    });
  });

  it('uses the default page size when searching dashboards', async () => {
    await searchRelatedDashboard(uiActions);

    expect(searchExecute).toHaveBeenCalledWith({
      onResults: expect.any(Function),
      search: {
        query: undefined,
        per_page: 100,
      },
      trigger: { id: 'searchDashboards' },
    });
  });

  it('gets dashboards by id with the dashboard ids action', async () => {
    const result = await getDashboardsById(uiActions, ['dashboard-1']);

    expect(result).toEqual([dashboard]);
    expect(getAction).toHaveBeenCalledWith('getDashboardsByIdsAction');
    expect(getDashboardsByIdsExecute).toHaveBeenCalledWith({
      onResults: expect.any(Function),
      ids: ['dashboard-1'],
      trigger: { id: 'getDashboardsById' },
    });
  });

  it('does not fetch dashboards when there are no ids', async () => {
    const result = await getDashboardsById(uiActions, []);

    expect(result).toEqual([]);
    expect(getAction).not.toHaveBeenCalled();
  });
});
