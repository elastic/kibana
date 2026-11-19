/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, type Observable } from 'rxjs';
import type { HttpStart } from '@kbn/core/public';
import type { ProjectNavigationLinkItem } from '@kbn/core-chrome-browser';
import type { RecentlyAccessed } from '@kbn/recently-accessed';
import { PLUGIN_ID } from '../../../../common';

export const RECENTLY_VIEWED_WORKFLOWS_KEY = 'workflowsRecentlyViewed';

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
