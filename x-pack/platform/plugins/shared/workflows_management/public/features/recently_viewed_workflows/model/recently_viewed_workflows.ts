/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, type Observable } from 'rxjs';
import type { CoreStart, HttpStart } from '@kbn/core/public';
import type { ProjectNavigationLinkItem } from '@kbn/core-chrome-browser';
import { type RecentlyAccessed, RecentlyAccessedService } from '@kbn/recently-accessed';
import { PLUGIN_ID } from '../../../../common';

const RECENTLY_VIEWED_WORKFLOWS_KEY = 'workflowsRecentlyViewed';

const getCurrentUserId = async ({ authc }: CoreStart['security']): Promise<string | undefined> => {
  try {
    const { profile_uid: profileUid, username } = await authc.getCurrentUser();
    return profileUid ?? username;
  } catch {
    // Without an authenticated user (for example, security is disabled) the space shares one history.
    return undefined;
  }
};

/**
 * Starts the recently viewed history of the current user in the current space.
 * Workflows can be private, so users of the same browser must not see each other's history.
 */
export const startRecentlyViewedWorkflows = async ({
  http,
  security,
}: Pick<CoreStart, 'http' | 'security'>): Promise<RecentlyAccessed> => {
  const userId = await getCurrentUserId(security);
  return new RecentlyAccessedService().start({
    http,
    key: userId ? `${RECENTLY_VIEWED_WORKFLOWS_KEY}:${userId}` : RECENTLY_VIEWED_WORKFLOWS_KEY,
  });
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
