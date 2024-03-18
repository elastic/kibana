/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NavigateToAppOptions } from '@kbn/core/public';
import { useCallback } from 'react';
import { SECURITY_UI_APP_ID } from './constants';
import { useNavigationContext } from './context';
import { getAppIdsFromId } from './links';

export type GetAppUrl = (param: {
  appId?: string;
  deepLinkId?: string;
  path?: string;
  absolute?: boolean;
}) => string;
/**
 * The `useGetAppUrl` function returns a full URL to the provided page path by using
 * kibana's `getUrlForApp()`
 */
export const useGetAppUrl = () => {
  const { getUrlForApp } = useNavigationContext().application;

  const getAppUrl = useCallback<GetAppUrl>(
    ({ appId = SECURITY_UI_APP_ID, ...options }) => getUrlForApp(appId, options),
    [getUrlForApp]
  );
  return { getAppUrl };
};

export type NavigateTo = (
  param: {
    url?: string;
    appId?: string;
    /**
     * Browsers will reset the scroll position to 0 when navigating to a new page.
     * This option will prevent that from happening.
     */
    restoreScroll?: boolean;
  } & NavigateToAppOptions
) => void;
/**
 * The `navigateTo` function navigates to any app using kibana's `navigateToApp()`.
 * When the `{ url: string }` parameter is passed it will navigate using `navigateToUrl()`.
 */
export const useNavigateTo = () => {
  const { navigateToApp, navigateToUrl } = useNavigationContext().application;

  const navigateTo = useCallback<NavigateTo>(
    ({ url, appId = SECURITY_UI_APP_ID, restoreScroll, ...options }) => {
      if (restoreScroll) {
        addScrollRestoration();
      }
      if (url) {
        navigateToUrl(url);
      } else {
        navigateToApp(appId, options);
      }
    },
    [navigateToApp, navigateToUrl]
  );
  return { navigateTo };
};

/**
 * Expects the browser scroll reset event to be fired after the navigation,
 * then restores the previous scroll position.
 */
const addScrollRestoration = () => {
  const scrollY = window.scrollY;
  const handler = () => window.scrollTo(0, scrollY);
  window.addEventListener('scroll', handler, { once: true });
};

/**
 * Returns `navigateTo` and `getAppUrl` navigation hooks
 */
export const useNavigation = () => {
  const { navigateTo } = useNavigateTo();
  const { getAppUrl } = useGetAppUrl();
  return { navigateTo, getAppUrl };
};

/**
 * Returns the appId, deepLinkId, and path from a given navigation id
 */
export const getNavigationPropsFromId = (
  id: string
): {
  appId: string;
  deepLinkId?: string;
  path?: string;
} => {
  const { appId = SECURITY_UI_APP_ID, ...options } = getAppIdsFromId(id);
  return { appId, ...options };
};
