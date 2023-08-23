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
  } & NavigateToAppOptions
) => void;
/**
 * The `navigateTo` function navigates to any app using kibana's `navigateToApp()`.
 * When the `{ url: string }` parameter is passed it will navigate using `navigateToUrl()`.
 */
export const useNavigateTo = () => {
  const { navigateToApp, navigateToUrl } = useNavigationContext().application;

  const navigateTo = useCallback<NavigateTo>(
    ({ url, appId = SECURITY_UI_APP_ID, ...options }) => {
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
 * Returns `navigateTo` and `getAppUrl` navigation hooks
 */
export const useNavigation = () => {
  const { navigateTo } = useNavigateTo();
  const { getAppUrl } = useGetAppUrl();
  return { navigateTo, getAppUrl };
};
