/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import { Router, Route } from '@kbn/shared-ux-router';
import { useLocation } from 'react-router-dom';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import {
  FleetStatusProvider,
  FlyoutContextProvider,
  KibanaVersionContext,
  sendGetCloudOnboardingDeployment,
} from '@kbn/fleet-plugin/public';
import { fromSOAuthMethod } from './step_components/authenticate_and_deploy_step/agent_based_section/credential_method_selector';
import type { IngestHubStartDependencies } from '../types';

import { OnboardingShell } from './onboarding_shell';
import { OnboardingFlowProvider } from './onboarding_flow_context';
import { clearOnboardingSession, getOnboardingSessionKey } from './onboarding_session_storage';
import { ONBOARDING_STEPS } from './steps';

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
 *
 * Note: `?deploymentId=` is intentionally kept in the URL after hydration as an edit-mode
 * indicator. Re-hydration on reload is prevented by a session flag (hydratedDeploymentId).
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
 * Fetches the SO and writes non-secret fields to session storage before React renders.
 * Clear must happen first so react-use's useSessionStorage does not re-write stale defaults.
 * Best-effort: any fetch or write error leaves the form empty and the user can start over.
 */
export async function hydrateOnboardingSession(
  integrationId: string,
  deploymentId: string
): Promise<boolean> {
  clearOnboardingSession(integrationId);
  try {
    const { item } = await sendGetCloudOnboardingDeployment(deploymentId);
    sessionStorage.setItem(
      getOnboardingSessionKey(integrationId, 'servicesStep'),
      JSON.stringify({ selectedServiceIds: item.services, dataFormat: item.dataFormat })
    );
    sessionStorage.setItem(
      getOnboardingSessionKey(integrationId, 'serviceSettingsStep'),
      JSON.stringify({
        globalRegion: item.globalRegion ?? '',
        serviceVars: item.serviceVars ?? {},
      })
    );
    const isAgentBased = item.mechanisms?.includes('agent_based') ?? false;
    const policyIds = item.agentPolicyIds ?? [];
    sessionStorage.setItem(
      getOnboardingSessionKey(integrationId, 'authenticateAndDeployStep'),
      isAgentBased
        ? JSON.stringify({
            deploymentMethod: 'agent_based',
            // Any persisted policy ids mean the policies already exist, so resume in
            // 'existing' mode — otherwise the hook's new-policy route would create another.
            agentHostsMode: policyIds.length ? 'existing' : 'new',
            selectedAgentPolicyIds: policyIds,
            // Secrets are never persisted; restoring the method puts the right form in front of the user.
            agentCredentialMethod: fromSOAuthMethod(item.authMethod), // CodeQL[js/clear-text-storage-of-sensitive-data] false positive: authMethod is a UI selector enum ('static_keys', 'assume_role', etc.), not a credential
          })
        : item.connectorId
        ? JSON.stringify({ connectorId: item.connectorId, authMethod: 'identity_federation' })
        : JSON.stringify({ authMethod: 'static_keys' })
    );
    // Seed policyIdsByInstance from packagePolicyIds so isAlreadyDeployed evaluates correctly
    // on resume. Without this, Back→Next would re-run deployToExistingAgentPolicies and create
    // duplicate package policies for every service instance.
    // packagePolicyIds is a flat list — we don't know which id maps to which instance, but any
    // truthy value per instance is enough to satisfy the isAlreadyDeployed check. Use the first
    // id as a placeholder for all services in the SO's services list.
    // Only seed for fully succeeded deploys — a failed status means some services need retry
    // and fabricating completion for them would prevent that retry path from running.
    const policyIdsByInstance: Record<string, string> =
      item.status === 'succeeded' && item.packagePolicyIds?.length && item.services?.length
        ? Object.fromEntries(
            item.services.map((svc, i) => [
              svc,
              item.packagePolicyIds![i] ?? item.packagePolicyIds![0],
            ])
          )
        : {};
    sessionStorage.setItem(
      getOnboardingSessionKey(integrationId, 'detectAndReviewStep'),
      JSON.stringify({
        serviceStatuses: {},
        policyIdsByInstance: item.policyIdsByInstance ?? policyIdsByInstance,
        ...(item.ecfStacks ? { ecfStacks: item.ecfStacks } : {}),
        failedInstances: [],
        deployErrors: {},
        onboardingDeploymentId: item.id,
      })
    );
    // Mark all steps except the last as complete so the shell defaults to detect-and-review.
    const stepState = Object.fromEntries(
      ONBOARDING_STEPS.map((s, i) => [
        s.id,
        i < ONBOARDING_STEPS.length - 1 ? 'complete' : 'incomplete',
      ])
    );
    sessionStorage.setItem(
      getOnboardingSessionKey(integrationId, 'stepState'),
      JSON.stringify(stepState)
    );
    return true;
  } catch {
    return false;
  }
}

export function getCloudService(
  cloudSetup: CloudSetup | undefined,
  cloudStart: CloudStart | undefined
): (CloudStart & Partial<CloudSetup>) | undefined {
  if (!cloudStart) return undefined;
  return { ...cloudSetup, ...cloudStart };
}

export async function renderOnboardingApp(
  coreStart: CoreStart,
  params: AppMountParameters,
  deps: IngestHubStartDependencies,
  // kibanaVersion is threaded here so Fleet components that call useKibanaVersion() (e.g.
  // AgentEnrollmentFlyout → installation_message.tsx) don't throw. The context is provided
  // at app root alongside FleetStatusProvider. See: fleet/public/hooks/use_kibana_version.ts
  kibanaVersion?: string,
  cloudSetup?: CloudSetup
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
    // Guard: only hydrate once per deploymentId. Re-hydrating on every reload would discard
    // edits made after resume. The param stays in the URL as an edit-mode indicator.
    const hydratedKey = getOnboardingSessionKey(integrationId, 'hydratedDeploymentId');
    if (sessionStorage.getItem(hydratedKey) !== deploymentId) {
      const hydrated = await hydrateOnboardingSession(integrationId, deploymentId);
      // Only mark as hydrated on success — a transient error must allow retry on next reload.
      if (hydrated) {
        sessionStorage.setItem(hydratedKey, deploymentId);
      }
    }
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
      // EuiThemeProvider (styled-components bridge) is required by any Fleet component that uses
      // `props.theme.eui.*` in styled-components (e.g. AgentPolicyCreateInlineForm at line 36).
      // Without it, styled-components receives undefined theme and throws at render time.
      // Fleet's own app root adds this provider for the same reason; we mirror it here.
      // See: fleet/public/applications/fleet/app.tsx lines 219-221.
      <EuiThemeProvider darkMode={coreStart.theme.getTheme().darkMode}>
        {/* authz must be part of the Kibana context so that Fleet's useAuthz() hook can read it
            when AgentEnrollmentFlyout is rendered. Without it, authz.fleet.readAgentPolicies throws.
            See: fleet/public/hooks/use_authz.ts */}
        <KibanaContextProvider
          services={{
            ...coreStart,
            cloud: getCloudService(cloudSetup, deps.cloud),
            fleet: deps.fleet,
            spaces: deps.spaces,
            authz: deps.fleet.authz,
          }}
        >
          <QueryClientProvider client={queryClient}>
            <FleetStatusProvider>
              {/* FlyoutContextProvider is required by AgentEnrollmentFlyout → EnrollmentRecommendation
                  → useFlyoutContext(). The hook throws if the context is absent.
                  See: fleet/public/hooks/use_flyout_context.tsx */}
              <FlyoutContextProvider>
                {/* KibanaVersionContext must wrap any Fleet component that calls useKibanaVersion().
                  AgentEnrollmentFlyout reaches it via installation_message.tsx → useAgentVersion.
                  Without this provider the hook throws by design (null context → Error).
                  See: fleet/public/hooks/use_kibana_version.ts */}
                <KibanaVersionContext.Provider value={kibanaVersion ?? ''}>
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
                </KibanaVersionContext.Provider>
              </FlyoutContextProvider>
            </FleetStatusProvider>
          </QueryClientProvider>
        </KibanaContextProvider>
      </EuiThemeProvider>
    )
  );
  return () => root.unmount();
}
