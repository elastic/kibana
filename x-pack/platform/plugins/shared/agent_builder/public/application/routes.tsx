/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Route, Routes } from '@kbn/shared-ux-router';
import React, { useMemo } from 'react';

import { AGENT_BUILDER_CONNECTORS_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { AppLayout } from './components/layout/app_layout';
import { RootRedirect } from './components/redirects/root_redirect';
import { LegacyConversationRedirect } from './components/redirects/legacy_conversation_redirect';
import { allRoutes } from './route_config';
import { useExperimentalFeatures } from './hooks/use_experimental_features';
import { useKibana } from './hooks/use_kibana';

export const AgentBuilderRoutes: React.FC<{}> = () => {
  const isExperimentalFeaturesEnabled = useExperimentalFeatures();
  const {
    services: { uiSettings },
  } = useKibana();
  const isConnectorsEnabled = uiSettings.get<boolean>(
    AGENT_BUILDER_CONNECTORS_ENABLED_SETTING_ID,
    false
  );

  const enabledRoutes = useMemo(() => {
    return allRoutes.filter((route) => {
      if (route.isExperimental && !isExperimentalFeaturesEnabled) {
        return false;
      }
      if (route.isConnectors && !isConnectorsEnabled) {
        return false;
      }
      return true;
    });
  }, [isExperimentalFeaturesEnabled, isConnectorsEnabled]);

  return (
    <AppLayout>
      <Routes>
        {enabledRoutes.map((route) => (
          <Route key={route.path} path={route.path} exact>
            {route.element}
          </Route>
        ))}

        {/* Legacy routes - redirect to new structure */}
        <Route path="/conversations/:conversationId">
          <LegacyConversationRedirect />
        </Route>

        {/* Redirect /agents to /agents/:lastAgentId */}
        <Route path="/agents" exact>
          <RootRedirect />
        </Route>

        {/* Root route - redirect to last used agent */}
        <Route path="/" exact>
          <RootRedirect />
        </Route>
      </Routes>
    </AppLayout>
  );
};
