/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { ProjectNavigationLinkItem } from '@kbn/core-chrome-browser';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import type { RecentlyAccessed, RecentlyAccessedHistoryItem } from '@kbn/recently-accessed';
import {
  getRecentlyViewedWorkflowPath,
  getRecentlyViewedWorkflowsNavItems$,
} from './recently_viewed_workflows';

const viewed = (id: string, label: string): RecentlyAccessedHistoryItem => ({
  id,
  label,
  link: getRecentlyViewedWorkflowPath(id),
});

describe('getRecentlyViewedWorkflowsNavItems$', () => {
  it('maps the history to links under the space base path and follows its changes', () => {
    const http = httpServiceMock.createStartContract({ basePath: '/s/my-space' });
    const items$ = new BehaviorSubject([viewed('wf-1', 'First'), viewed('wf-2', 'Second')]);
    const recentlyViewed: jest.Mocked<RecentlyAccessed> = {
      add: jest.fn(),
      remove: jest.fn(),
      get: jest.fn(() => items$.value),
      get$: jest.fn(() => items$.asObservable()),
    };
    const emitted: ProjectNavigationLinkItem[][] = [];

    getRecentlyViewedWorkflowsNavItems$(http, recentlyViewed).subscribe((navItems) =>
      emitted.push(navItems)
    );
    items$.next([viewed('wf-2', 'Second')]);

    expect(emitted).toEqual([
      [
        { id: 'wf-1', href: '/s/my-space/app/workflows/wf-1', label: 'First' },
        { id: 'wf-2', href: '/s/my-space/app/workflows/wf-2', label: 'Second' },
      ],
      [{ id: 'wf-2', href: '/s/my-space/app/workflows/wf-2', label: 'Second' }],
    ]);
    expect(http.post).not.toHaveBeenCalled();
  });
});
