/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { Router, Route } from '@kbn/shared-ux-router';

import { OnboardingShell } from './onboarding_shell';

export function renderOnboardingApp(coreStart: CoreStart, params: AppMountParameters) {
  const root = createRoot(params.element);
  root.render(
    coreStart.rendering.addContext(
      <Router history={params.history}>
        <Route path="/:integrationId">
          <OnboardingShell />
        </Route>
      </Router>
    )
  );
  return () => root.unmount();
}
