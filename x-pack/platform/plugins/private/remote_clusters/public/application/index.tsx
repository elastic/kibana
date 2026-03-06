/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Provider } from 'react-redux';
import type { CoreStart, ScopedHistory, ExecutionContextStart } from '@kbn/core/public';

import { KibanaRenderContextProvider, useExecutionContext } from '../shared_imports';
import { App } from './app';
import { remoteClustersStore } from './store';
import { AppContextProvider, type Context } from './app_context';

interface AppWithExecutionContextProps {
  history: ScopedHistory;
  executionContext: ExecutionContextStart;
}

const AppWithExecutionContext = ({ history, executionContext }: AppWithExecutionContextProps) => {
  useExecutionContext(executionContext, {
    type: 'application',
    page: 'remoteClusters',
  });

  return <App history={history} />;
};

export const renderApp = (
  elem: Element,
  appDependencies: Context,
  history: ScopedHistory,
  startServices: CoreStart
) => {
  render(
    <KibanaRenderContextProvider {...startServices}>
      <Provider store={remoteClustersStore}>
        <AppContextProvider context={appDependencies}>
          <AppWithExecutionContext
            history={history}
            executionContext={appDependencies.executionContext}
          />
        </AppContextProvider>
      </Provider>
    </KibanaRenderContextProvider>,
    elem
  );
  return () => unmountComponentAtNode(elem);
};
