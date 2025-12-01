/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route } from '@kbn/shared-ux-router';
import type { RouteComponentProps } from 'react-router-dom';
import type { HttpSetup } from '@kbn/core/public';
import { Provider } from 'react-redux';

import { EnrichPolicyCreate } from '../../../public/application/sections/enrich_policy_create';
import { indexManagementStore } from '../../../public/application/store';
import { WithAppDependencies, createServices } from './setup_environment';

interface RenderCreateEnrichPolicyOptions {
  /** App services context overrides */
  appServicesContext?: Record<string, unknown>;
}

/**
 * Render the EnrichPolicyCreate component with all necessary context.
 *
 * @param httpSetup - HTTP setup from setupEnvironment()
 * @param options - Optional configuration
 * @returns RTL render result
 *
 * @example
 * ```ts
 * renderCreateEnrichPolicy(httpSetup);
 * await screen.findByTestId('configurationForm');
 * ```
 */
export const renderCreateEnrichPolicy = (
  httpSetup: HttpSetup,
  options?: RenderCreateEnrichPolicyOptions
) => {
  const { appServicesContext = {} } = options || {};
  const services = createServices();
  const store = indexManagementStore(services as any);

  const CreateEnrichPolicyWithRouter = () => (
    <MemoryRouter initialEntries={['/enrich_policies/create']}>
      <Route
        path="/:section(enrich_policies)/create"
        render={(props: RouteComponentProps) => <EnrichPolicyCreate {...props} />}
      />
    </MemoryRouter>
  );

  const context = {
    services,
    ...appServicesContext,
  };

  return render(
    <Provider store={store}>
      {React.createElement(WithAppDependencies(CreateEnrichPolicyWithRouter, httpSetup, context))}
    </Provider>
  );
};
