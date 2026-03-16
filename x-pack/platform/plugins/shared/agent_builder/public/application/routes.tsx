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
import { allRoutes } from './route_config';
import { useExperimentalFeatures } from './hooks/use_experimental_features';

export const AgentBuilderRoutes: React.FC<{}> = () => {
  const isExperimentalFeaturesEnabled = useExperimentalFeatures();

  const enabledRoutes = useMemo(() => {
    return allRoutes.filter((route) => {
      if (route.isExperimental && !isExperimentalFeaturesEnabled) {
        return false;
      }
      return true;
    });
  }, [isExperimentalFeaturesEnabled]);

  return (
    <AppLayout>
      <Routes>
        {enabledRoutes.map((route) => (
          <Route key={route.path} path={route.path}>
            {route.element}
          </Route>
        ))}

        {/* Legacy routes - redirect to new structure */}
        <Route path="/conversations/:conversationId">
          <LegacyConversationRedirect />
        </Route>

        {/* Root route - redirect to last used agent */}
        <Route path="/">
          <RootRedirect />
        </Route>
      </Routes>
    </AppLayout>
  );
};
