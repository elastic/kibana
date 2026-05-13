/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, type RenderResult } from '@testing-library/react';
import * as userEventLib from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import { Provider } from 'react-redux';
import type { Store } from 'redux';
import type { RouteComponentProps } from 'react-router-dom';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { MemoryRouter, Routes, Route } from '@kbn/shared-ux-router';

export interface CcrRenderResult extends RenderResult {
  user: UserEvent;
  store?: Store;
}

type CcrRouteProps = RouteComponentProps;

/** Object passed to `onRouter` from the wrapped Route (matches CCR routing mocks). */
export interface OnRouterPayload {
  history: RouteComponentProps['history'];
  route: {
    match: RouteComponentProps['match'];
    location: RouteComponentProps['location'];
  };
}

export interface RenderWithRouterOptions<ExtraProps extends object = {}> {
  store?: Store;
  onRouter?: (router: OnRouterPayload) => void;
  initialEntries?: string[];
  routePath?: string;
  componentProps?: Partial<ExtraProps>;
}

/**
 * Render helper for CCR components with Redux store and React Router setup.
 * Returns a user event instance configured for fake timers.
 *
 * @example
 * const { user } = renderWithRouter(MyComponent, {
 *   store: ccrStore,
 *   initialEntries: ['/follower_indices/edit/myIndex'],
 *   routePath: '/follower_indices/edit/:id',
 * });
 */
export const renderWithRouter = <ExtraProps extends object = {}>(
  Component: React.ComponentType<CcrRouteProps & Partial<ExtraProps>>,
  {
    store,
    onRouter,
    initialEntries = ['/'],
    routePath = '/',
    componentProps = {},
  }: RenderWithRouterOptions<ExtraProps> = {}
): CcrRenderResult => {
  const user = userEventLib.default.setup({
    advanceTimers: jest.advanceTimersByTime,
    pointerEventsCheck: 0, // Skip pointer-events check for EUI popovers/portals
  });

  const Wrapped = (routeProps: CcrRouteProps) => {
    // Setup routing callback if provided
    if (typeof onRouter === 'function') {
      const router = {
        history: routeProps.history,
        route: { match: routeProps.match, location: routeProps.location },
      };
      onRouter(router);
    }

    const ComponentWithProps = (
      <Component
        {...componentProps}
        match={routeProps.match}
        history={routeProps.history}
        location={routeProps.location}
      />
    );

    return (
      <IntlProvider locale="en">
        {store ? <Provider store={store}>{ComponentWithProps}</Provider> : ComponentWithProps}
      </IntlProvider>
    );
  };

  const renderResult = render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path={routePath} component={Wrapped} />
      </Routes>
    </MemoryRouter>
  );

  return {
    user,
    store,
    ...renderResult,
  };
};
