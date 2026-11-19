/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import type { ProjectNavigationLinkItem } from '@kbn/core-chrome-browser';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { mockAuthenticatedUser } from '@kbn/core-security-common/mocks';
import type { RecentlyAccessed, RecentlyAccessedHistoryItem } from '@kbn/recently-accessed';
import {
  getRecentlyViewedWorkflowPath,
  getRecentlyViewedWorkflowsNavItems$,
  startRecentlyViewedWorkflows,
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

describe('startRecentlyViewedWorkflows', () => {
  const startAs = (getCurrentUser: () => Promise<ReturnType<typeof mockAuthenticatedUser>>) => {
    const core = coreMock.createStart({ basePath: '/s/my-space' });
    core.security.authc.getCurrentUser.mockImplementation(getCurrentUser);
    return startRecentlyViewedWorkflows(core);
  };
  const startAsUser = (user: Parameters<typeof mockAuthenticatedUser>[0]) =>
    startAs(() => Promise.resolve(mockAuthenticatedUser(user)));

  afterEach(() => localStorage.clear());

  it('keeps a separate history for each user of the browser', async () => {
    (await startAsUser({ profile_uid: 'alice' })).add(
      getRecentlyViewedWorkflowPath('wf-1'),
      'Private',
      'wf-1'
    );

    expect((await startAsUser({ profile_uid: 'bob' })).get()).toEqual([]);
    expect((await startAsUser({ profile_uid: 'alice' })).get()).toEqual([
      viewed('wf-1', 'Private'),
    ]);
  });

  it('uses the username when the user has no profile', async () => {
    (await startAsUser({ profile_uid: undefined, username: 'alice' })).add(
      getRecentlyViewedWorkflowPath('wf-1'),
      'Private',
      'wf-1'
    );

    expect((await startAsUser({ profile_uid: undefined, username: 'bob' })).get()).toEqual([]);
  });

  it('shares one history in the space when there is no authenticated user', async () => {
    const noUser = () => Promise.reject(new Error('No authenticated user'));
    (await startAs(noUser)).add(getRecentlyViewedWorkflowPath('wf-1'), 'Shared', 'wf-1');

    expect((await startAs(noUser)).get()).toEqual([viewed('wf-1', 'Shared')]);
    expect((await startAsUser({ profile_uid: 'alice' })).get()).toEqual([]);
  });
});
