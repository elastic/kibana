/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { Router, Route } from '@kbn/shared-ux-router';
import { useLocation } from 'react-router-dom';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { IngestHubStartDependencies } from '../types';

import { OnboardingShell } from './onboarding_shell';
import { OnboardingFlowProvider } from './onboarding_flow_context';

const DEFAULT_RETURN_APP = 'integrations';

function RootRedirect() {
  const { services } = useKibana();
  const location = useLocation<{ returnApp?: string } | undefined>();
  useEffect(() => {
    const returnApp = location.state?.returnApp || DEFAULT_RETURN_APP;
    services.application?.navigateToApp(returnApp);
  }, [services.application, location.state]);
  return null;
}

export function renderOnboardingApp(
  coreStart: CoreStart,
  params: AppMountParameters,
  deps: IngestHubStartDependencies = {}
) {
  const queryClient = new QueryClient();
  const root = createRoot(params.element);
  root.render(
    coreStart.rendering.addContext(
      <KibanaContextProvider services={{ ...coreStart, cloud: deps.cloud }}>
        <QueryClientProvider client={queryClient}>
          <OnboardingFlowProvider>
            <Router history={params.history}>
              <Route exact path="/">
                <RootRedirect />
              </Route>
              <Route path="/:integrationId">
                <OnboardingShell />
              </Route>
            </Router>
          </OnboardingFlowProvider>
        </QueryClientProvider>
      </KibanaContextProvider>
    )
  );
  return () => root.unmount();
}
