/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import type { BehaviorSubject } from 'rxjs';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { Route, Router, Routes } from '@kbn/shared-ux-router';
import { PLUGIN_NAME } from '../common/constants';
import { AppPage } from './pages/app_page';
import { NotebookListing } from './pages/notebook_listing';
import { EditNotebookPage, NewNotebookPage } from './pages/notebook_page';
import type { NotebookStartDependencies } from './plugin';
import { NotebookServicesProvider } from './services';
import { createNotebookApi } from './services/notebook_api';

export const renderApp = ({
  coreStart,
  plugins,
  params,
  performanceCheck$,
}: {
  coreStart: CoreStart;
  plugins: NotebookStartDependencies;
  params: AppMountParameters;
  performanceCheck$: BehaviorSubject<boolean>;
}): (() => void) => {
  const { docTitle } = coreStart.chrome;
  docTitle.change(PLUGIN_NAME);
  const api = createNotebookApi(coreStart.http);

  const root = createRoot(params.element);
  root.render(
    coreStart.rendering.addContext(
      <NotebookServicesProvider services={{ core: coreStart, plugins, performanceCheck$ }}>
        <Router history={params.history}>
          <Routes>
            <Route exact path="/new">
              <NewNotebookPage api={api} />
            </Route>
            <Route exact path="/:id/apps/:appId">
              <AppPage api={api} />
            </Route>
            <Route exact path="/:id">
              <EditNotebookPage api={api} />
            </Route>
            <Route path="/">
              <NotebookListing api={api} />
            </Route>
          </Routes>
        </Router>
      </NotebookServicesProvider>
    )
  );

  return () => {
    docTitle.reset();
    root.unmount();
  };
};
