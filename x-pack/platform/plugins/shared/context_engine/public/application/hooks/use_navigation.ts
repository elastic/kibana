/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { CONTEXT_ENGINE_APP_ID } from '../../../common/features';
import type { AiIndexCreatedLocationState } from '../ai_index_created_location_state';
import { useKibana } from './use_kibana';

export type ContextEngineLocationState = AiIndexCreatedLocationState;

const buildPath = (path: string, params?: Record<string, string>): string => {
  const queryParams = new URLSearchParams(params);
  return queryParams.size ? `${path}?${queryParams}` : path;
};

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
    (path: string, params?: Record<string, string>, state?: ContextEngineLocationState): void => {
      application.navigateToApp(CONTEXT_ENGINE_APP_ID, {
        path: buildPath(path, params),
        ...(state !== undefined ? { state } : {}),
      });
    },
    [application]
  );

  return { createContextEngineUrl, navigateToContextEngine };
};
