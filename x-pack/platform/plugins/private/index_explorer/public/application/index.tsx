/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { IndexExplorerStartDependencies } from '../plugin';
import { IndexExplorerApi } from './api';
import { App } from './app';
import { ServicesProvider } from './services';

export function renderApp({
  coreStart,
  plugins: { dataViews, lens },
  params,
}: {
  coreStart: CoreStart;
  plugins: IndexExplorerStartDependencies;
  params: AppMountParameters;
}): () => void {
  const { element, history } = params;
  const api = new IndexExplorerApi(coreStart.http);

  ReactDOM.render(
    coreStart.rendering.addContext(
      <ServicesProvider value={{ core: coreStart, api, history, dataViews, lens }}>
        <App history={history} />
      </ServicesProvider>
    ),
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
}
