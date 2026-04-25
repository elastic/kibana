/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import { Router } from '@kbn/shared-ux-router';
import type { HttpSetup } from '@kbn/core/public';
import type { MemoryHistory } from 'history';
import { createMemoryHistory } from 'history';

import { App } from '../../../public/application/app';
import { WithAppDependencies } from './setup_environment';

interface RenderAppOptions {
  initialEntries?: string[];
}

export interface RenderAppResult extends RenderResult {
  history: MemoryHistory;
}

/**
 * Render Snapshot & Restore app with routing and app dependencies.
 *
 * Use this helper for tests targeting top-level routes like:
 * - /add_repository
 * - /edit_repository/:name*
 * - /restore/:repositoryName/:snapshotId*
 */
export const renderApp = (
  httpSetup: HttpSetup,
  { initialEntries = ['/repositories'] }: RenderAppOptions = {}
): RenderAppResult => {
  const history = createMemoryHistory({ initialEntries });

  const AppWithDeps = WithAppDependencies(App, httpSetup, {
    services: { history },
  });

  return {
    ...render(
      <Router history={history}>
        <AppWithDeps />
      </Router>
    ),
    history,
  };
};
