/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { NavigateToAppOptions } from '@kbn/core/public';
import { MANAGEMENT_APP_ID } from '@kbn/management-plugin/public';
import { useKibana } from '../utils/kibana_react';

export const useNavigation = (appId: string) => {
  const { navigateToApp, getUrlForApp } = useKibana().services.application;

  const navigateTo = useCallback(
    (options: NavigateToAppOptions) => {
      navigateToApp(appId, options);
    },
    [appId, navigateToApp]
  );
  const getAppUrl = useCallback(
    (options?: { deepLinkId?: string; path?: string; absolute?: boolean }) =>
      getUrlForApp(appId, options),
    [appId, getUrlForApp]
  );
  return { navigateTo, getAppUrl };
};

export const useMaintenanceWindowsNavigation = () => {
  const { navigateTo, getAppUrl } = useNavigation(MANAGEMENT_APP_ID);
  const path = '/';
  const deepLinkId = 'taskManager';

  return {
    navigateToTaskManager: () => navigateTo({ path, deepLinkId }),
    getTaskManagerUrl: (absolute?: boolean) =>
      getAppUrl({
        path,
        deepLinkId,
        absolute,
      }),
  };
};
