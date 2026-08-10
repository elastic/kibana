/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineLatest, from, of } from 'rxjs';
import { take, map, takeUntil, mergeMap, shareReplay } from 'rxjs';
import type { ApplicationStart, ChromeStart } from '@kbn/core/public';
import type { GlobalSearchResultProvider } from '@kbn/global-search-plugin/public';
import { getAppResults } from './get_app_results';

const applicationType = 'application';

type ChromeForSearch = Pick<ChromeStart, 'getChromeStyle' | 'getDeepLinkNavPaths$'>;

export const createApplicationResultProvider = (
  applicationPromise: Promise<ApplicationStart>,
  chromePromise: Promise<ChromeForSearch>
): GlobalSearchResultProvider => {
  const searchableApps$ = from(applicationPromise).pipe(
    mergeMap((application) => application.applications$),
    map((apps) =>
      [...apps.values()].filter(
        // only include non-chromeless enabled apps
        (app) => app.status === 0 && app.chromeless !== true
      )
    ),
    shareReplay(1)
  );

  return {
    id: 'application',
    find: ({ term, types, tags }, { aborted$, maxResults }) => {
      if (tags || (types && !types.includes(applicationType))) {
        return of([]);
      }
      return combineLatest([searchableApps$.pipe(take(1)), from(chromePromise)]).pipe(
        takeUntil(aborted$),
        take(1),
        mergeMap(([apps, chrome]) =>
          chrome.getDeepLinkNavPaths$().pipe(
            take(1),
            map((deepLinkNavPaths) => {
              const results = getAppResults(term ?? '', [...apps.values()], {
                chromeStyle: chrome.getChromeStyle(),
                deepLinkNavPaths,
              });
              return results.sort((a, b) => b.score - a.score).slice(0, maxResults);
            })
          )
        )
      );
    },
    getSearchableTypes: () => [applicationType],
  };
};
