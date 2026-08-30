/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { debounceTime, first, firstValueFrom, map, type Observable } from 'rxjs';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';

export const expandCollapsedDashboardSections = (dashboardApi: DashboardApi): string[] => {
  const layout = dashboardApi.layout$.value;
  const collapsedIds = Object.entries(layout.sections)
    .filter(([, section]) => section.collapsed)
    .map(([id]) => id);

  if (collapsedIds.length === 0) {
    return [];
  }

  dashboardApi.layout$.next({
    ...layout,
    sections: Object.fromEntries(
      Object.entries(layout.sections).map(([id, section]) => [
        id,
        collapsedIds.includes(id) ? { ...section, collapsed: false } : section,
      ])
    ),
  });

  return collapsedIds;
};

export const restoreCollapsedDashboardSections = (
  dashboardApi: DashboardApi,
  collapsedIds: readonly string[]
): void => {
  if (collapsedIds.length === 0) {
    return;
  }

  const layout = dashboardApi.layout$.value;
  dashboardApi.layout$.next({
    ...layout,
    sections: Object.fromEntries(
      Object.entries(layout.sections).map(([id, section]) => [
        id,
        collapsedIds.includes(id) ? { ...section, collapsed: true } : section,
      ])
    ),
  });
};

/**
 * Resolves after dashboard panels have finished loading. Debounces so panels
 * that are about to start loading (e.g. after expanding a section) are waited on.
 */
export const waitForDashboardPaint = (
  dataLoading$: Observable<boolean | undefined>,
  debounceMs = 300
): Promise<void> =>
  firstValueFrom(
    dataLoading$.pipe(
      debounceTime(debounceMs),
      first((isLoading) => !isLoading),
      map(() => undefined)
    )
  );
