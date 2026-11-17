/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

import { OnboardingFlowProvider } from '../onboarding_flow_context';

import { OnboardingShell } from './onboarding_shell';
import { clearOnboardingSession, discardMarkedSessions } from './onboarding_session_storage';

/**
 * The onboarding wizard, rendered inside an embedding surface (the Add integration modal) rather
 * than as its own app.
 *
 * `renderOnboardingApp` does three things this cannot: it owns the React root, it reads
 * `?deploymentId=` to resume a flow, and it remembers a `returnUrl` to navigate back to. None of
 * those apply here — an embedded flow has no URL of its own and closes rather than navigates — so
 * what remains is the session lifecycle: start clean, and drop a cancelled flow on unmount.
 *
 * The provider recipe the app mounts (Kibana context with `authz`, FleetStatusProvider,
 * FlyoutContextProvider, KibanaVersionContext, a query client and the styled-components theme
 * bridge) is already supplied by `EmbeddedIntegrationsProvider`, so only the flow context is added.
 */
export function EmbeddedOnboarding() {
  const { integrationId } = useParams<{ integrationId: string }>();
  // Session storage has to be cleared before the step hooks mount: `useSessionStorage` writes its
  // default on first mount and re-serializes every render, so clearing from inside the tree is too
  // late. Same reason `renderOnboardingApp` does this before rendering.
  const clearedRef = useRef<string>();
  if (clearedRef.current !== integrationId) {
    clearedRef.current = integrationId;
    clearOnboardingSession(integrationId);
  }

  useEffect(() => {
    return () => {
      // Nothing can rewrite the session once the modal is gone.
      discardMarkedSessions();
    };
  }, []);

  return (
    <OnboardingFlowProvider>
      <OnboardingShell />
    </OnboardingFlowProvider>
  );
}
