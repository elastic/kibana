/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { useHomeServices } from '../context';

/**
 * Builds the URL of a path under the hosting app's root. Core routes clicks on an `href` to it within
 * the app, without a page reload, so links need no `onClick`. Returns `undefined` until the current
 * app is known.
 */
export const useHomeAppHref = (): ((path: string) => string | undefined) => {
  const { application } = useHomeServices();
  const appId = useObservable(application.currentAppId$);

  return useCallback(
    (path: string) => (appId ? application.getUrlForApp(appId, { path }) : undefined),
    [application, appId]
  );
};
