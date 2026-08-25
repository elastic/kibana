/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import type { HttpSetup } from '@kbn/core/public';

import { TemplateCreate } from '../../../public/application/sections/template_create';
import { WithAppDependencies } from './setup_environment';

interface RenderTemplateCreateOptions {
  /** Whether to render as legacy template */
  isLegacy?: boolean;
}

/**
 * Render the TemplateCreate component with all necessary context.
 *
 * @param httpSetup - HTTP setup from setupEnvironment()
 * @param options - Optional configuration
 * @returns RTL render result
 *
 * @example
 * ```ts
 * renderTemplateCreate(httpSetup);
 * await screen.findByTestId('pageTitle');
 * ```
 */
export const renderTemplateCreate = async (
  httpSetup: HttpSetup,
  options?: RenderTemplateCreateOptions
) => {
  const { isLegacy = false } = options || {};
  const routePath = isLegacy ? '/create_template?legacy=true' : '/create_template';

  const CreateWithRouter = () => (
    <MemoryRouter initialEntries={[routePath]}>
      <Route path="/create_template" component={TemplateCreate} />
    </MemoryRouter>
  );

  const result = render(React.createElement(WithAppDependencies(CreateWithRouter, httpSetup)));

  // Advance timers to flush initial HTTP requests and React state updates

  return result;
};
