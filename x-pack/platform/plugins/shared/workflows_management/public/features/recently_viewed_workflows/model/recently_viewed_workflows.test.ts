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
import { Sha256 } from '@kbn/crypto-browser';
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
  type CurrentUser = ReturnType<typeof mockAuthenticatedUser>;

  const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

  const startAs = (getCurrentUser: () => Promise<CurrentUser>, basePath = '/s/my-space') => {
    const core = coreMock.createStart({ basePath });
    core.security.authc.getCurrentUser.mockImplementation(getCurrentUser);
    return startRecentlyViewedWorkflows(core);
  };
  const startAsUser = async (
    user: Parameters<typeof mockAuthenticatedUser>[0],
    basePath?: string
  ): Promise<RecentlyAccessed> => {
    const history = startAs(() => Promise.resolve(mockAuthenticatedUser(user)), basePath);
    await flushPromises();
    return history;
  };
  const viewWorkflow = (history: RecentlyAccessed, id: string, label: string) =>
    history.add(getRecentlyViewedWorkflowPath(id), label, id);

  afterEach(() => localStorage.clear());

  it('keeps a separate history for each user of the browser', async () => {
    viewWorkflow(await startAsUser({ profile_uid: 'alice' }), 'wf-1', 'Private');

    expect((await startAsUser({ profile_uid: 'bob' })).get()).toEqual([]);
    expect((await startAsUser({ profile_uid: 'alice' })).get()).toEqual([
      viewed('wf-1', 'Private'),
    ]);
  });

  it('uses the username when the user has no profile', async () => {
    viewWorkflow(
      await startAsUser({ profile_uid: undefined, username: 'alice' }),
      'wf-1',
      'Private'
    );

    expect((await startAsUser({ profile_uid: undefined, username: 'bob' })).get()).toEqual([]);
  });

  it('does not let a user ID collide with the space part of another key', async () => {
    const otherSpaceSuffix = new Sha256().update('/s/other', 'utf8').digest('base64');
    viewWorkflow(await startAsUser({ profile_uid: 'alice' }, '/s/other'), 'wf-1', 'Private');

    expect((await startAsUser({ profile_uid: `alice-${otherSpaceSuffix}` }, '')).get()).toEqual([]);
  });

  it('keeps no history when the current user cannot be found', async () => {
    const history = startAs(() => Promise.reject(new Error('Service unavailable')));
    await flushPromises();
    viewWorkflow(history, 'wf-1', 'Private');
    await flushPromises();

    expect(history.get()).toEqual([]);
    expect(Object.keys(localStorage)).toEqual([]);
  });

  it('records views made before the current user is known', async () => {
    let resolveUser: (user: CurrentUser) => void = () => {};
    const history = startAs(() => new Promise((resolve) => (resolveUser = resolve)));
    const emitted: RecentlyAccessedHistoryItem[][] = [];
    history.get$().subscribe((items) => emitted.push(items));

    viewWorkflow(history, 'wf-1', 'First');
    resolveUser(mockAuthenticatedUser({ profile_uid: 'alice' }));
    await flushPromises();

    expect(history.get()).toEqual([viewed('wf-1', 'First')]);
    expect(emitted.at(-1)).toEqual([viewed('wf-1', 'First')]);
  });
});
