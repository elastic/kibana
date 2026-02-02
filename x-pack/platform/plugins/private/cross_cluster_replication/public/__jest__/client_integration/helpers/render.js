/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import * as userEventLib from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { MemoryRouter, Routes, Route } from '@kbn/shared-ux-router';

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
/**
 * @returns {import('@testing-library/react').RenderResult & { user: import('@testing-library/user-event').UserEvent }}
 */
export const renderWithRouter = (
  Component,
  { store, onRouter, initialEntries = ['/'], routePath = '/', defaultProps = {}, ...props } = {}
) => {
  const user = userEventLib.default.setup({
    // eslint-disable-next-line no-undef
    advanceTimers: jest.advanceTimersByTime,
    pointerEventsCheck: 0, // Skip pointer-events check for EUI popovers/portals
  });

  const Wrapped = (routeProps) => {
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
        {...defaultProps}
        {...props}
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
