/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Route, Routes } from '@kbn/shared-ux-router';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';

import { AppLayout } from './components/layout/app_layout';
import { RootRedirect } from './components/redirects/root_redirect';
import { LegacyConversationRedirect } from './components/redirects/legacy_conversation_redirect';
import { getEnabledRoutes, getViewIdForPathname } from './route_config';
import { useRouteAccessConfig } from './hooks/use_route_access_config';
import { useKibana } from './hooks/use_kibana';

export const AgentBuilderRoutes: React.FC<{}> = () => {
  const routeAccessConfig = useRouteAccessConfig();
  const { pathname } = useLocation();
  const {
    services: { executionContext },
  } = useKibana();

  const enabledRoutes = useMemo(() => getEnabledRoutes(routeAccessConfig), [routeAccessConfig]);

  const viewId = useMemo(
    () => getViewIdForPathname(pathname, enabledRoutes),
    [pathname, enabledRoutes]
  );

  useExecutionContext(executionContext, { type: 'application', page: viewId });

  return (
    <AppLayout>
      <Routes>
        {enabledRoutes.map((route) => (
          <Route key={route.path} path={route.path} exact>
            <TrackApplicationView viewId={route.viewId}>{route.element}</TrackApplicationView>
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
