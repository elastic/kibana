/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicAppInfo, PublicAppDeepLinkInfo, AppCategory } from '@kbn/core/public';
import type { ChromeStyle, DeepLinkNavPath } from '@kbn/core-chrome-browser';
import { distance } from 'fastest-levenshtein';
import type { GlobalSearchProviderResult } from '@kbn/global-search-plugin/public';

/** Type used internally to represent an application unrolled into its separate deepLinks */
export interface AppLink {
  id: string;
  app: PublicAppInfo;
  subLinkTitles: string[];
  path: string;
  keywords: string[];
  category?: AppCategory;
  euiIconType?: string;
  deepLinkId?: string;
}

export interface GetAppResultsOptions {
  chromeStyle?: ChromeStyle;
  deepLinkNavPaths?: ReadonlyMap<string, DeepLinkNavPath> | null;
}

export const getAppResults = (
  term: string,
  apps: PublicAppInfo[],
  options: GetAppResultsOptions = {}
): GlobalSearchProviderResult[] => {
  return (
    apps
      // Unroll all deepLinks, only if there is a search term
      .flatMap((app) =>
        term.length > 0
          ? flattenDeepLinks(app)
          : app.visibleIn.includes('globalSearch')
          ? [
              {
                id: app.id,
                app,
                path: app.appRoute,
                subLinkTitles: [],
                keywords: app.keywords ?? [],
              },
            ]
          : []
      )
      .map((appLink) => ({
        appLink,
        score: scoreApp(term, appLink, options),
      }))
      .filter(({ appLink, score }) => {
        if (score <= 0) {
          return false;
        }
        // Project chrome: only apps present in the active nav tree.
        if (options.chromeStyle === 'project' && options.deepLinkNavPaths != null) {
          return getNavPath(appLink, options) !== undefined;
        }
        return true;
      })
      .map(({ appLink, score }) => appToResult(appLink, score, options))
  );
};

/** Base used so earlier nav items outrank later ones on empty search. */
const NAV_ORDER_SCORE_BASE = 1_000_000;

export const scoreApp = (
  term: string,
  appLink: AppLink,
  options: GetAppResultsOptions = {}
): number => {
  term = term.toLowerCase();

  // Empty search: every title matches `startsWith('')`. Prefer sidenav order.
  if (term.length === 0) {
    const navPath = getNavPath(appLink, options);
    if (navPath) {
      return Math.max(1, NAV_ORDER_SCORE_BASE - navPath.order);
    }
    return 90;
  }

  const registrationTitle = [appLink.app.title, ...appLink.subLinkTitles].join(' ').toLowerCase();
  const displayTitle = getDisplayTitleParts(appLink, options).join(' ').toLowerCase();
  const appScoreByTerms = Math.max(
    scoreAppByTerms(term, registrationTitle),
    scoreAppByTerms(term, displayTitle)
  );

  const keywords = [
    ...appLink.app.keywords.map((keyword) => keyword.toLowerCase()),
    ...appLink.keywords.map((keyword) => keyword.toLowerCase()),
  ];
  const appScoreByKeywords = scoreAppByKeywords(term, keywords);

  return Math.max(appScoreByTerms, appScoreByKeywords);
};

const scoreAppByTerms = (term: string, title: string): number => {
  if (title === term) {
    // shortcuts to avoid calculating the distance when there is an exact match somewhere.
    return 100;
  }
  if (title.startsWith(term)) {
    return 90;
  }
  if (title.includes(term)) {
    return 75;
  }
  const length = Math.max(term.length, title.length);
  const dist = distance(term, title);

  // maximum lev distance is length, we compute the match ratio (lower distance is better)
  const ratio = Math.floor((1 - dist / length) * 100);
  if (ratio >= 60) {
    return ratio;
  }
  return 0;
};

const scoreAppByKeywords = (term: string, keywords: string[]): number => {
  const scores = keywords.map((keyword) => {
    return scoreAppByTerms(term, keyword);
  });
  return Math.max(...scores);
};

const getNavPath = (
  appLink: AppLink,
  { chromeStyle = 'classic', deepLinkNavPaths = null }: GetAppResultsOptions
): DeepLinkNavPath | undefined => {
  if (chromeStyle !== 'project' || !deepLinkNavPaths) {
    return undefined;
  }
  const key = appLink.deepLinkId
    ? `${appLink.app.id}:${appLink.deepLinkId}`
    : appLink.app.id;
  const navPath = deepLinkNavPaths.get(key);
  return navPath && navPath.titles.length > 0 ? navPath : undefined;
};

const getDisplayTitleParts = (appLink: AppLink, options: GetAppResultsOptions): string[] => {
  const navPath = getNavPath(appLink, options);
  if (navPath) {
    return [...navPath.titles];
  }

  // Project chrome without a nav hit: leaf-only title (no classic hierarchy).
  if (options.chromeStyle === 'project') {
    if (appLink.subLinkTitles.length > 0) {
      return [appLink.subLinkTitles[appLink.subLinkTitles.length - 1]];
    }
    return [appLink.app.title];
  }

  if (appLink.app.id === 'management' && appLink.subLinkTitles.length > 0) {
    return appLink.subLinkTitles;
  }

  return [appLink.app.title, ...appLink.subLinkTitles];
};

const getCategoryMeta = (
  appLink: AppLink,
  navPath: DeepLinkNavPath | undefined,
  options: GetAppResultsOptions
): { categoryId: string | null; categoryLabel: string | null } => {
  if (navPath) {
    // Never use registration AppCategory for nav hits. Panel category only when it
    // isn't already the title root.
    const categoryLabel =
      navPath.categoryLabel && navPath.titles[0] !== navPath.categoryLabel
        ? navPath.categoryLabel
        : null;
    return { categoryId: null, categoryLabel };
  }

  // Soft orphans in project chrome: searchable, but no classic taxonomy label.
  if (options.chromeStyle === 'project') {
    return { categoryId: null, categoryLabel: null };
  }

  return {
    categoryId: appLink.category?.id ?? appLink.app.category?.id ?? null,
    categoryLabel: appLink.category?.label ?? appLink.app.category?.label ?? null,
  };
};

export const appToResult = (
  appLink: AppLink,
  score: number,
  options: GetAppResultsOptions = {}
): GlobalSearchProviderResult => {
  const navPath = getNavPath(appLink, options);

  return {
    id: appLink.id,
    title: getDisplayTitleParts(appLink, options).join(' / '),
    type: 'application',
    icon: navPath?.icon ?? appLink.euiIconType ?? appLink.app.euiIconType,
    url: appLink.path,
    meta: getCategoryMeta(appLink, navPath, options),
    score,
  };
};

const flattenDeepLinks = (app: PublicAppInfo, deepLink?: PublicAppDeepLinkInfo): AppLink[] => {
  if (!deepLink) {
    return [
      ...(app.visibleIn.includes('globalSearch')
        ? [
            {
              id: app.id,
              app,
              path: app.appRoute,
              subLinkTitles: [],
              keywords: app?.keywords ?? [],
            },
          ]
        : []),
      ...app.deepLinks.flatMap((appDeepLink) => flattenDeepLinks(app, appDeepLink)),
    ];
  }
  return [
    ...(deepLink.path && deepLink.visibleIn.includes('globalSearch')
      ? [
          {
            ...deepLink,
            id: `${app.id}-${deepLink.id}`,
            deepLinkId: deepLink.id,
            app,
            path: `${app.appRoute}${deepLink.path}`,
            subLinkTitles: [deepLink.title],
            keywords: [...(deepLink.keywords ?? [])],
          },
        ]
      : []),
    ...deepLink.deepLinks
      .flatMap((deepDeepLink) => flattenDeepLinks(app, deepDeepLink))
      .map((deepAppLink) => ({
        ...deepAppLink,
        // shift current sublink title into array of sub-sublink titles
        subLinkTitles: [deepLink.title, ...deepAppLink.subLinkTitles],
        // combine current sublink keywords into array of sub-link keywords
        keywords: [...deepLink.keywords, ...deepAppLink.keywords],
      })),
  ];
};
