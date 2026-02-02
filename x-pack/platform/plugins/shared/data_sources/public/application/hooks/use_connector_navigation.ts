/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { DATA_SOURCES_APP_ID } from '../../../common/constants';
import { useKibana } from './use_kibana';

export const useConnectorNavigation = () => {
  const {
    services: { application },
  } = useKibana();
  const location = useLocation();
  const currentPath = location.pathname;

  const navigateToConnectors = useCallback(() => {
    application.navigateToApp(DATA_SOURCES_APP_ID, {
      path: '/connectors',
    });
  }, [application]);

  const navigateToActiveSources = useCallback(() => {
    application.navigateToApp(DATA_SOURCES_APP_ID, {
      path: '/active-sources',
    });
  }, [application]);

  // Connectors tab is only selected when explicitly on that path
  const isConnectorsTab = useMemo(() => currentPath === '/connectors', [currentPath]);

  // Active sources tab is selected by default (including root path)
  const isActiveSourcesTab = useMemo(() => !isConnectorsTab, [isConnectorsTab]);

  return {
    navigateToConnectors,
    navigateToActiveSources,
    isConnectorsTab,
    isActiveSourcesTab,
    currentPath,
  };
};
