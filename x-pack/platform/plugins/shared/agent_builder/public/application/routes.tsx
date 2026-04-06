/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Route, Routes } from '@kbn/shared-ux-router';
import React, { useMemo } from 'react';

import { AppLayout } from './components/layout/app_layout';
import { RootRedirect } from './components/redirects/root_redirect';
import { LegacyConversationRedirect } from './components/redirects/legacy_conversation_redirect';
import { getEnabledRoutes } from './route_config';
import { useFeatureFlags } from './hooks/use_feature_flags';

export const AgentBuilderRoutes: React.FC<{}> = () => {
  const featureFlags = useFeatureFlags();

  const enabledRoutes = useMemo(() => getEnabledRoutes(featureFlags), [featureFlags]);

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
