/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import type { HttpSetup } from '@kbn/core/public';
import type { MemoryHistory } from 'history';
import { createMemoryHistory } from 'history';

import { SnapshotRestoreHome } from '../../../public/application/sections/home/home';
import { WithAppDependencies } from './setup_environment';

interface RenderHomeOptions {
  initialEntries?: string[];
}

export interface RenderHomeResult extends RenderResult {
  history: MemoryHistory;
}

/**
 * Render Snapshot & Restore home with routing and app dependencies.
 *
 * Note: The app uses a section route param (repositories/snapshots/policies/restore_status).
 * This helper keeps route matching broad so tests can navigate within nested routes.
 */
export const renderHome = (
  httpSetup: HttpSetup,
  { initialEntries = ['/repositories'] }: RenderHomeOptions = {}
): RenderHomeResult => {
  // Use a real memory history instance for routing and also inject it into app services
  // so reactRouterNavigate(history, ...) updates the same router.
  const history = createMemoryHistory({ initialEntries });

  const HomeWithDeps = WithAppDependencies(SnapshotRestoreHome, httpSetup, {
    services: { history },
  });

  return {
    ...render(
      <Router history={history}>
        <Routes>
          <Route
            path="/:section(repositories|snapshots|restore_status|policies)"
            component={HomeWithDeps}
          />
        </Routes>
      </Router>
    ),
    history,
  };
};
