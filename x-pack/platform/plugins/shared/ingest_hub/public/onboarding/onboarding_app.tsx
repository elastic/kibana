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
import { FleetStatusProvider, sendGetCloudOnboardingDeployment } from '@kbn/fleet-plugin/public';
import type { IngestHubStartDependencies } from '../types';

import { OnboardingShell } from './onboarding_shell';
import { OnboardingFlowProvider } from './onboarding_flow_context';
import { clearOnboardingSession, getOnboardingSessionKey } from './onboarding_session_storage';

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

/**
 * Returns the integration id when session storage should be cleared on app mount, null otherwise.
 *
 * Conditions:
 * - An integration id is present in the pathname (not the root redirect).
 * - The navigation carried `state.newSession === true` (set by the tile entry point).
 * - No `?deploymentId=<id>` query param is present; when it is, the hydration path in
 *   elastic/ingest-dev#8099 is responsible for clearing-then-hydrating atomically.
 */
export function shouldClearSession(location: {
  pathname: string;
  search: string;
  state: unknown;
}): string | null {
  const integrationId = location.pathname.split('/').filter(Boolean)[0];
  const isNewSession =
    (location.state as { newSession?: boolean } | undefined)?.newSession === true;
  const hasDeploymentId = new URLSearchParams(location.search).has('deploymentId');
  return integrationId && isNewSession && !hasDeploymentId ? integrationId : null;
}

/**
 * Recursively converts typed SO values back to session-storage-compatible strings.
 * At SO write time, multi-value fields (e.g. `regions`) are stored as string arrays.
 * Session storage expects raw comma-separated strings so that toTyped() can re-convert them.
 */
function detypifyVarsForSession(value: unknown): unknown {
  if (Array.isArray(value)) return value.join(',');
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = detypifyVarsForSession(v);
    }
    return result;
  }
  return value;
}

/**
 * Fetches the SO and writes non-secret fields to session storage before React renders.
 * Clear must happen first so react-use's useSessionStorage does not re-write stale defaults.
 * Best-effort: any fetch or write error leaves the form empty and the user can start over.
 */
async function hydrateOnboardingSession(integrationId: string, deploymentId: string): Promise<void> {
  clearOnboardingSession(integrationId);
  try {
    const { item } = await sendGetCloudOnboardingDeployment(deploymentId);
    sessionStorage.setItem(
      getOnboardingSessionKey(integrationId, 'servicesStep'),
      JSON.stringify({ selectedServiceIds: item.services })
    );
    sessionStorage.setItem(
      getOnboardingSessionKey(integrationId, 'serviceSettingsStep'),
      JSON.stringify({
        globalRegion: item.globalRegion ?? '',
        serviceVars: detypifyVarsForSession(item.serviceVars ?? {}),
      })
    );
    sessionStorage.setItem(
      getOnboardingSessionKey(integrationId, 'authenticateAndDeployStep'),
      JSON.stringify({ connectorId: item.connectorId, authType: 'identity_federation' })
    );
    sessionStorage.setItem(
      getOnboardingSessionKey(integrationId, 'detectAndReviewStep'),
      JSON.stringify({
        serviceStatuses: {},
        policyIdsByInstance: {},
        failedInstances: [],
        deployErrors: {},
        onboardingDeploymentId: item.id,
      })
    );
  } catch {
    // Non-fatal — user sees empty form
  }
}

export async function renderOnboardingApp(
  coreStart: CoreStart,
  params: AppMountParameters,
  deps: IngestHubStartDependencies
) {
  // Write session storage before any hooks initialize.
  // useSessionStorage (react-use) writes its default on first mount and re-serializes
  // every render, so clearing or hydrating from inside the tree is too late — the hooks'
  // React state already holds the old values and immediately rewrites them.
  const { pathname, search, hash, state } = params.history.location;
  const urlParams = new URLSearchParams(search);
  const deploymentId = urlParams.get('deploymentId');

  if (deploymentId) {
    const integrationId = pathname.split('/').filter(Boolean)[0] || 'aws';
    await hydrateOnboardingSession(integrationId, deploymentId);
    // Strip the param so a reload does not re-hydrate and discard any edits made after resume.
    urlParams.delete('deploymentId');
    const newSearch = urlParams.toString();
    params.history.replace({ pathname, search: newSearch ? `?${newSearch}` : '', hash }, undefined);
  } else {
    const integrationId = shouldClearSession({ pathname, search, state });
    if (integrationId) {
      clearOnboardingSession(integrationId);
      // Consume the flag so a reload does not trigger another clear and wipe an in-progress flow.
      // window.history.state survives a reload, so leaving it in place would re-clear every time.
      params.history.replace({ pathname, search, hash }, undefined);
    }
  }

  const queryClient = new QueryClient();
  const root = createRoot(params.element);
  root.render(
    coreStart.rendering.addContext(
      <KibanaContextProvider
        services={{ ...coreStart, cloud: deps.cloud, fleet: deps.fleet, spaces: deps.spaces }}
      >
        <QueryClientProvider client={queryClient}>
          <FleetStatusProvider>
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
          </FleetStatusProvider>
        </QueryClientProvider>
      </KibanaContextProvider>
    )
  );
  return () => root.unmount();
}
