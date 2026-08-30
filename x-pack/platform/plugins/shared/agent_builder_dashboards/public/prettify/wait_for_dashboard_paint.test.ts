/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import {
  expandCollapsedDashboardSections,
  restoreCollapsedDashboardSections,
  waitForDashboardPaint,
} from './wait_for_dashboard_paint';

const layoutWith = (sections: Record<string, { collapsed: boolean; title: string; grid: { y: number } }>) => ({
  panels: {},
  pinnedPanels: {},
  sections,
});

const createDashboardApi = (
  layout: ReturnType<typeof layoutWith>,
  dataLoading?: boolean
) => {
  const layout$ = new BehaviorSubject(layout);
  const dataLoading$ = new BehaviorSubject<boolean | undefined>(dataLoading);
  return {
    api: { layout$, dataLoading$ } as unknown as DashboardApi,
    layout$,
    dataLoading$,
  };
};

describe('expandCollapsedDashboardSections', () => {
  it('expands collapsed sections and returns their ids', () => {
    const { api, layout$ } = createDashboardApi(
      layoutWith({
        s1: { collapsed: true, title: 'One', grid: { y: 0 } },
        s2: { collapsed: false, title: 'Two', grid: { y: 4 } },
      })
    );

    expect(expandCollapsedDashboardSections(api)).toEqual(['s1']);
    expect(layout$.value.sections.s1.collapsed).toBe(false);
    expect(layout$.value.sections.s2.collapsed).toBe(false);
  });

  it('does not emit when nothing is collapsed', () => {
    const { api, layout$ } = createDashboardApi(
      layoutWith({
        s1: { collapsed: false, title: 'One', grid: { y: 0 } },
      })
    );
    const next = jest.fn();
    const sub = layout$.subscribe(next);
    next.mockClear();

    expect(expandCollapsedDashboardSections(api)).toEqual([]);
    expect(next).not.toHaveBeenCalled();
    sub.unsubscribe();
  });
});

describe('restoreCollapsedDashboardSections', () => {
  it('collapses the sections that were expanded for capture', () => {
    const { api, layout$ } = createDashboardApi(
      layoutWith({
        s1: { collapsed: false, title: 'One', grid: { y: 0 } },
        s2: { collapsed: false, title: 'Two', grid: { y: 4 } },
      })
    );

    restoreCollapsedDashboardSections(api, ['s1']);

    expect(layout$.value.sections.s1.collapsed).toBe(true);
    expect(layout$.value.sections.s2.collapsed).toBe(false);
  });
});

describe('waitForDashboardPaint', () => {
  it('resolves once panels are no longer loading', async () => {
    const { dataLoading$ } = createDashboardApi(layoutWith({}), true);

    const painted = waitForDashboardPaint(dataLoading$, 0);
    dataLoading$.next(false);

    await expect(painted).resolves.toBeUndefined();
  });

  it('resolves immediately when panels are already idle', async () => {
    const { dataLoading$ } = createDashboardApi(layoutWith({}), false);

    await expect(waitForDashboardPaint(dataLoading$, 0)).resolves.toBeUndefined();
  });
});
