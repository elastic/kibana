/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { CONTEXT_ENGINE_APP_ID } from '../../../common/features';
import { useKibana } from './use_kibana';

const buildPath = (path: string, params?: Record<string, string>): string => {
  const queryParams = new URLSearchParams(params);
  return queryParams.size ? `${path}?${queryParams}` : path;
};

/**
 * Centralized navigation for the Context Engine app. URLs are resolved through
 * Kibana's `application` service so they include the app base path, and clicks
 * on the resulting `href`s are turned into in-app (SPA) navigation by the
 * `RedirectAppLinks` wrapper mounted in `mount.tsx`.
 */
export const useNavigation = () => {
  const {
    services: { application },
  } = useKibana();

  const createContextEngineUrl = useCallback(
    (path: string, params?: Record<string, string>): string =>
      application.getUrlForApp(CONTEXT_ENGINE_APP_ID, { path: buildPath(path, params) }),
    [application]
  );

  const navigateToContextEngine = useCallback(
    (path: string, params?: Record<string, string>): void => {
      application.navigateToApp(CONTEXT_ENGINE_APP_ID, { path: buildPath(path, params) });
    },
    [application]
  );

  return { createContextEngineUrl, navigateToContextEngine };
};
