/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { HttpSetup } from '@kbn/core/public';
import { I18nProvider } from '@kbn/i18n-react';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import type { Store } from 'redux';
import { Provider } from 'react-redux';

import type { AppRouter } from '../../../public/application/services';
import { registerRouter } from '../../../public/application/services';
import { createRemoteClustersStore } from '../../../public/application/store';

import { WithAppDependencies } from './setup_environment';

export interface RenderRemoteClustersOptions {
  httpSetup: HttpSetup;
  /**
   * Extra values merged into the AppContextProvider context.
   * (These override defaults, including `isCloudEnabled`.)
   */
  contextOverrides?: Record<string, unknown>;
  /**
   * Initial URL entries for the memory history.
   */
  initialEntries?: string[];
  /**
   * Route path used to mount the component so `useRouteMatch()` / route params work.
   */
  routePath?: string;
}

export interface RenderRemoteClustersResult extends RenderResult {
  user: ReturnType<typeof userEvent.setup>;
  history: ReturnType<typeof createMemoryHistory>;
  store: Store;
}

export function renderRemoteClustersRoute(
  Component: React.ComponentType,
  {
    httpSetup,
    contextOverrides = {},
    initialEntries = ['/'],
    routePath = '/',
  }: RenderRemoteClustersOptions
): RenderRemoteClustersResult {
  const store = createRemoteClustersStore();
  const history = createMemoryHistory({ initialEntries });

  const router: AppRouter = {
    // ScopedHistory is structurally compatible with MemoryHistory for our usage in tests.
    history: history as unknown as AppRouter['history'],
    route: { location: history.location },
  };

  registerRouter(router);

  const WrappedComponent = WithAppDependencies(Component, httpSetup, contextOverrides);

  const user = userEvent.setup();

  const result = render(
    <I18nProvider>
      <Provider store={store}>
        <Router history={history}>
          <Routes>
            <Route path={routePath} component={WrappedComponent} />
          </Routes>
        </Router>
      </Provider>
    </I18nProvider>
  );

  return { ...result, user, history, store };
}
