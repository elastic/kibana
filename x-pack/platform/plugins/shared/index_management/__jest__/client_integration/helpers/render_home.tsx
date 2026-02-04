/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { HttpSetup } from '@kbn/core/public';
import { Provider } from 'react-redux';
import { merge } from 'lodash';

import { AppWithoutRouter } from '../../../public/application/app';
import { indexManagementStore } from '../../../public/application/store';
import { WithAppDependencies, createServices } from './setup_environment';
import { httpService } from '../../../public/application/services/http';

interface RenderHomeOptions {
  /** Initial route entries for MemoryRouter */
  initialEntries?: string[];
  /** App dependencies overrides (merged into base AppDependencies) */
  dependenciesOverrides?: unknown;
  /**
   * @deprecated Use `dependenciesOverrides` instead.
   */
  appServicesContext?: unknown;
}

/**
 * Render the IndexManagementHome component with all necessary context.
 *
 * @param httpSetup - HTTP setup from setupEnvironment()
 * @param options - Optional configuration
 * @returns RTL render result
 *
 * @example
 * ```ts
 * renderHome(httpSetup);
 * await screen.findByTestId('appTitle');
 * expect(screen.getByTestId('appTitle')).toHaveTextContent('Index Management');
 * ```
 */
export const renderHome = async (httpSetup: HttpSetup, options?: RenderHomeOptions) => {
  const {
    initialEntries = ['/indices?includeHiddenIndices=true'],
    dependenciesOverrides,
    appServicesContext,
  } = options || {};

  // CRITICAL: Set up httpService BEFORE creating the component
  // This ensures httpService.httpClient is available when components try to use it during render
  httpService.setup(httpSetup);

  const services = createServices();
  const store = indexManagementStore(services);

  const rawOverrides = (dependenciesOverrides ?? appServicesContext ?? {}) as Record<
    string,
    unknown
  >;
  const servicesOverrides = (rawOverrides.services ?? {}) as Record<string, unknown>;

  // Ensure app context uses the same services instance as the store, while still allowing
  // tests to override/extend nested service fields (e.g. extensionsService private props).
  merge(services, servicesOverrides);

  const overridingDependencies: Record<string, unknown> = {
    ...rawOverrides,
    services,
  };

  const HomeWithRouter = () => (
    <MemoryRouter initialEntries={initialEntries}>
      <AppWithoutRouter />
    </MemoryRouter>
  );

  const result = render(
    <Provider store={store}>
      {React.createElement(WithAppDependencies(HomeWithRouter, httpSetup, overridingDependencies))}
    </Provider>
  );

  return result;
};
