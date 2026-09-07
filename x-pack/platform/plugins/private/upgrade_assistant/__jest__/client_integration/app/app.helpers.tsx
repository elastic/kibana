/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { createMemoryHistory } from 'history';
import { App } from '../../../public/application/app';
import { WithAppDependencies } from '../helpers/setup_environment';

export const setupAppPage = async (
  httpSetup: HttpSetup,
  overrides?: Record<string, unknown>
): Promise<{ history: ReturnType<typeof createMemoryHistory> }> => {
  const history = createMemoryHistory({ initialEntries: ['/overview'] });

  const servicesOverrides = (overrides?.services as Record<string, unknown> | undefined) ?? {};
  const AppWithDependencies = WithAppDependencies(App, httpSetup, {
    ...overrides,
    services: {
      ...servicesOverrides,
      history,
    },
  });

  renderWithI18n(<AppWithDependencies history={history as any} />);

  // Wait for the initial render baseline (mount-time requests/async state).
  await waitFor(() => {
    const settledElement =
      screen.queryByTestId('missingKibanaPrivilegesMessage') ??
      screen.queryByTestId('isUpgradingMessage') ??
      screen.queryByTestId('isUpgradeCompleteMessage') ??
      screen.queryByTestId('overviewPageHeader');

    expect(settledElement).not.toBeNull();
  });

  return { history };
};
