/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, map, type Observable, of, switchMap } from 'rxjs';
import type { CoreStart, HttpStart } from '@kbn/core/public';
import type { ProjectNavigationLinkItem } from '@kbn/core-chrome-browser';
import { Sha256 } from '@kbn/crypto-browser';
import { type RecentlyAccessed, RecentlyAccessedService } from '@kbn/recently-accessed';
import { PLUGIN_ID } from '../../../../common';

const RECENTLY_VIEWED_WORKFLOWS_KEY = 'workflowsRecentlyViewed';

const NO_HISTORY: RecentlyAccessed = {
  add: () => {},
  remove: () => {},
  get: () => [],
  get$: () => of([]),
};

const getCurrentUserId = async ({ authc }: CoreStart['security']): Promise<string | undefined> => {
  try {
    const { profile_uid: profileUid, username } = await authc.getCurrentUser();
    return profileUid ?? username;
  } catch {
    return undefined;
  }
};

const startUserHistory = async ({
  http,
  security,
}: Pick<CoreStart, 'http' | 'security'>): Promise<RecentlyAccessed | undefined> => {
  const userId = await getCurrentUserId(security);
  if (!userId) {
    return undefined;
  }
  // Hashing gives the user part a fixed length, so it cannot collide with the space suffix of another key.
  const userHash = new Sha256().update(userId, 'utf8').digest('base64');
  return new RecentlyAccessedService().start({
    http,
    key: `${RECENTLY_VIEWED_WORKFLOWS_KEY}:${userHash}`,
  });
};

/**
 * Starts the recently viewed history of the current user in the current space.
 * Workflows can be private, so users of the same browser must not see each other's history.
 * Writes made before the user is known are applied when the history is ready.
 */
export const startRecentlyViewedWorkflows = (
  core: Pick<CoreStart, 'http' | 'security'>
): RecentlyAccessed => {
  const history$ = new BehaviorSubject(NO_HISTORY);
  let ready: Promise<RecentlyAccessed> | undefined;

  const getUserHistory = (): Promise<RecentlyAccessed> => {
    ready ??= startUserHistory(core).then((userHistory) => {
      // A failed lookup does not prove that there is no user, so no history is safer than a
      // shared one. The next write looks up the user again.
      if (!userHistory) {
        ready = undefined;
        return NO_HISTORY;
      }
      history$.next(userHistory);
      return userHistory;
    });
    return ready;
  };
  getUserHistory();

  return {
    add: (link, label, id) => {
      getUserHistory().then((userHistory) => userHistory.add(link, label, id));
    },
    remove: (id) => {
      getUserHistory().then((userHistory) => userHistory.remove(id));
    },
    get: () => history$.value.get(),
    get$: () => history$.pipe(switchMap((userHistory) => userHistory.get$())),
  };
};

/** The app path stored for a recently viewed workflow, without the base path. */
export const getRecentlyViewedWorkflowPath = (id: string): string =>
  `/app/${PLUGIN_ID}/${encodeURIComponent(id)}`;

/** Recently viewed workflows as side navigation links, labelled with the names stored at view time. */
export const getRecentlyViewedWorkflowsNavItems$ = (
  http: HttpStart,
  recentlyViewed: RecentlyAccessed
): Observable<ProjectNavigationLinkItem[]> =>
  recentlyViewed
    .get$()
    .pipe(
      map((items) =>
        items.map(({ id, link, label }) => ({ id, href: http.basePath.prepend(link), label }))
      )
    );
