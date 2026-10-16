/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '../../../test_utils/render_with_ml_context';

jest.mock('@kbn/shared-ux-utility', () => ({
  ...jest.requireActual('@kbn/shared-ux-utility'),
  dynamic: () => () => <div data-test-subj="mlPageEsqlJob" />,
}));

jest.mock('../../use_resolver', () => ({
  useRouteResolver: () => ({ context: { initialized: true } }),
}));

import { esqlRouteFactory } from './esql';

describe('esqlRouteFactory', () => {
  const navigateToApp = jest.fn();

  it('creates the ES|QL route with management breadcrumbs', () => {
    const route = esqlRouteFactory(navigateToApp);

    expect(route.path).toBe('/jobs/new_job/esql');
    expect(route.breadcrumbs.map(({ text }) => text)).toEqual([
      'Stack Management',
      'Anomaly detection jobs',
      'Create job',
      'ES|QL',
    ]);
  });

  it('renders the ES|QL shell target', () => {
    const route = esqlRouteFactory(navigateToApp);
    const routeProps = { location: { pathname: route.path, search: '' } } as Parameters<
      typeof route.render
    >[0];
    const dependencies = {} as Parameters<typeof route.render>[1];

    renderWithI18n(route.render(routeProps, dependencies));

    expect(screen.getByTestId('mlPageEsqlJob')).toBeInTheDocument();
  });
});
