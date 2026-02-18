/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { createMemoryHistory } from 'history';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { Overview } from '../../../public/application/components';
import { WithAppDependencies } from '../helpers/setup_environment';

export const setupOverviewPage = async (
  httpSetup: HttpSetup,
  overrides?: Record<string, unknown>
): Promise<void> => {
  const OverviewWithDependencies = WithAppDependencies(Overview, httpSetup, overrides);
  const history = createMemoryHistory({ initialEntries: ['/overview'] });

  renderWithI18n(
    <Router history={history}>
      <Routes>
        <Route exact path="/overview" component={OverviewWithDependencies} />
      </Routes>
    </Router>
  );

  // Wait for the initial render baseline (mount-time requests/async state).
  await screen.findByTestId('overviewPageHeader');
};
