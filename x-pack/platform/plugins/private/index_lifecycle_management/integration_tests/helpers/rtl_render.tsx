/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Pure RTL render helpers for ILM components.
 * These replace the testbed setup pattern with direct render() calls.
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import type { HttpSetup } from '@kbn/core/public';
import type { AppServicesContext } from '../../public/types';
import { WithAppDependencies } from './setup_environment';
import { EditPolicy } from '../../public/application/sections/edit_policy';
import { POLICY_NAME } from '../edit_policy/constants';

/**
 * Render the EditPolicy component with all necessary context.
 *
 * @param httpSetup - HTTP setup from setupEnvironment()
 * @param options - Optional configuration
 * @returns RTL render result
 *
 * @example
 * ```ts
 * const { getByTestId } = renderEditPolicy(httpSetup);
 * expect(getByTestId('policyNameField')).toBeInTheDocument();
 * ```
 */
export function renderEditPolicy(
  httpSetup: HttpSetup,
  options?: {
    /** App services context overrides (e.g., license, cloud config) */
    appServicesContext?: Partial<AppServicesContext>;
    /** Initial route entries for MemoryRouter */
    initialEntries?: string[];
    /** Component route path */
    componentRoutePath?: string;
    /** Whether this is a new policy (affects route and params) */
    isNewPolicy?: boolean;
  }
) {
  const { appServicesContext, initialEntries, componentRoutePath, isNewPolicy } = options || {};

  // Determine route based on whether this is a new policy
  const isNewPolicyRoute = isNewPolicy || initialEntries?.[0] === '/policies/edit';
  const policyName = isNewPolicyRoute ? '' : POLICY_NAME;
  const routePath = isNewPolicyRoute ? '/policies/edit' : `/policies/edit/${POLICY_NAME}`;

  // Create wrapper with MemoryRouter and routing props
  const EditPolicyWithRouter = () => (
    <MemoryRouter initialEntries={initialEntries || [routePath]}>
      <EditPolicy
        match={{
          params: { policyName },
          isExact: true,
          path:
            componentRoutePath ||
            (isNewPolicyRoute ? '/policies/edit' : '/policies/edit/:policyName'),
          url: routePath,
        }}
        location={{
          pathname: routePath,
          search: '',
          hash: '',
          state: undefined,
        }}
        history={{} as any}
      />
    </MemoryRouter>
  );

  const ComponentWithDependencies = WithAppDependencies(
    EditPolicyWithRouter,
    httpSetup,
    appServicesContext
  );

  return render(<ComponentWithDependencies />);
}

/**
 * Render any ILM component with app dependencies.
 *
 * @param Component - React component to render
 * @param httpSetup - HTTP setup from setupEnvironment()
 * @param options - Optional configuration
 * @returns RTL render result
 *
 * @example
 * ```ts
 * const { getByText } = renderWithDependencies(MyComponent, httpSetup, {
 *   props: { someProp: 'value' }
 * });
 * ```
 */
export function renderWithDependencies(
  Component: React.ComponentType<any>,
  httpSetup: HttpSetup,
  options?: {
    /** App services context overrides */
    appServicesContext?: Partial<AppServicesContext>;
    /** Props to pass to the component */
    props?: Record<string, unknown>;
  }
) {
  const { appServicesContext, props = {} } = options || {};

  const ComponentWithDependencies = WithAppDependencies(Component, httpSetup, appServicesContext);

  return render(<ComponentWithDependencies {...props} />);
}
