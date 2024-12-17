/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Provider } from 'react-redux';

import { CoreSetup, ExecutionContextStart } from '@kbn/core/public';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';
import {
  KibanaContextProvider,
  KibanaRenderContextProvider,
  useExecutionContext,
} from './shared_imports';
// @ts-ignore
import { rollupJobsStore } from './crud_app/store';
// @ts-ignore
import { App } from './crud_app/app';

import './index.scss';

const AppWithExecutionContext = ({
  history,
  executionContext,
}: {
  history: ManagementAppMountParams['history'];
  executionContext: ExecutionContextStart;
}) => {
  useExecutionContext(executionContext, {
    type: 'application',
    page: 'rollup',
  });

  return <App history={history} />;
};

/**
 * This module will be loaded asynchronously to reduce the bundle size of your plugin's main bundle.
 */
export const renderApp = async (
  core: CoreSetup,
  { history, element, setBreadcrumbs }: ManagementAppMountParams
) => {
  const [coreStart] = await core.getStartServices();

  const services = {
    history,
    setBreadcrumbs,
  };

  render(
    <KibanaRenderContextProvider {...coreStart}>
      <KibanaContextProvider services={services}>
        <Provider store={rollupJobsStore}>
          <AppWithExecutionContext executionContext={core.executionContext} history={history} />
        </Provider>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>,
    element
  );
  return () => {
    unmountComponentAtNode(element);
  };
};
