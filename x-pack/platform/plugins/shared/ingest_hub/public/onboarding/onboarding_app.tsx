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
import { clearOnboardingSession } from './onboarding_session_storage';

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
  // Clear session storage before any hooks initialize.
  // useSessionStorage (react-use) writes its default on first mount and re-serializes
  // every render, so clearing from inside the tree is too late — the hooks' React state
  // already holds the old values and immediately rewrites them.
  const { pathname, search, state } = params.history.location;
  const integrationId = pathname.split('/').filter(Boolean)[0];
  const isNewSession = (state as { newSession?: boolean } | undefined)?.newSession === true;
  const hasDeploymentId = new URLSearchParams(search).has('deploymentId');

  if (integrationId && isNewSession && !hasDeploymentId) {
    clearOnboardingSession(integrationId);
    // Consume the flag so a reload does not trigger another clear and wipe an in-progress flow.
    // window.history.state survives a reload, so leaving it in place would re-clear every time.
    params.history.replace({ pathname, search }, undefined);
  }

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
